const jwt_decode = require("jwt-decode");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const RandomString = require("randomstring");

const User = require('../models/user.model');
const { get } = require("mongoose");

// --------------- Email send -------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: `${process.env.EMAIL}`,
    pass: `${process.env.PASSWORD}`,
  },
});

const AuthController = {

  registerClient: async (req, res) => {
    try {
      const { firstName, lastName, email, password, passwordVerify } = req.body;
      if (!firstName || !lastName || !email || !password || !passwordVerify) {
        return res
          .status(400)
          .json({ message: "Not all fields have been entered" });
      }
      User.findOne({ email }).then((user) => {
        if (user) { return res.status(400).json({ error: "Email is already taken" }); }
      });

      if (password !== passwordVerify) { return res.status(400).json({ error: "Mismatch password" }); }

      //generate random string for activation code
      const activationCode = RandomString.generate({ length: 4, charset: "numeric", });
      const token = jwt.sign(
        { firstName, lastName, email, password, passwordVerify, activationCode },
        `${process.env.JWT_ACC_ACTIVATE}`,
        { expiresIn: "10m" }
      );

      res.cookie("token", token, { expiresIn: "10m" });

      const options = {
        from: "ettouils505@gmail.com",
        to: email,
        subject: "Account Activation Code",
        html: `
               <div style = "max-width: 700px;
                     margin: 0 auto;
                     background-color: #fff;
                     box-shadow: 0px 0px 10px rgba(0,0,0,0.1);
                     border-radius: 5px;
                     border: 5px solid #ddd;padding: 50px 20px; font-size: 110%;"
               >
               <h2 style="font-size: 18px; margin-bottom: 20px; text-align: center; text-align: center; color: #044494"> Welcome to Ordear</h1>
               <p style="margin-top: 0; margin-bottom: 15;">Just copy the code below in your interface to validate your email address</p>
               <a>${activationCode}</a>
               <p>Equipe Ordear</p>
               </div>
                
                `,
      };

      transporter.sendMail(options, function (err, info) {
        if (err) {
          return res.status(400).json({ error: "Error activating account" +err});
        } else { return res.status(200).json({ message: "An email has been sent" }); }
      });

    } catch (err) { return res.status(500).json({ message: "Register failed" + "" + err.message }); }
  },

  activateAccount: async (req, res) => {
    try {
      const token = req.cookies.token;
      if (token) {
        jwt.verify(
          token,
          `${process.env.JWT_ACC_ACTIVATE}`,
          function (err, decodedToken) {
            if (err) {
              return res
                .status(400)
                .json({ error: "Incorrect or Expired code." });
            }
            const { firstName, lastName, email, password, activationCode } = decodedToken;
            User.findOne({ email }).then(async (err, user) => {
              if (user) {
                return res
                  .status(400)
                  .json({ error: "User with this email already exists." });
              }
              const salt = await bcrypt.genSalt();
              const passwordHash = await bcrypt.hash(password, salt);
              const code = req.body.activationCode;

              if (code !== activationCode) {
                return res.status(400).json({ error: "Mismatch code" });
              }

              const newUser = new User({
                firstName,
                lastName,
                image: '',
                phone: "+1 11111111",
                address: "Montreal, Canada",
                birthday: "01/01/2023",
                email,
                password: passwordHash,
                role: 'client',
                activate: 1

              });

              newUser.save()
                .then(savedUser => {
                  res.status(200).json({message:"User added" + savedUser})
                })
                .catch(err => {
                  console.error('Erreur lors de l\'enregistrement de l\'utilisateur :', err);
                });
            });
          }
        );
      } else { return res.json({ error: "Something went wrong." }); }
    } catch (err) { return res.status(500).json({ message: "Register failed" + "" + err.message }); }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Not all fields have been entered" });
      }
      const user = await User.findOne({ email: email });

      const activation = user.activate;
      if (activation == true) {
        if (!user) {
          return res
            .status(400)
            .json({ message: "No account with this email has been founded" });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(400).json({ message: "Invalid credentials" });
        }
        //Using token for login
        const tokenLogin = jwt.sign({ id: user._id, role: user.role }, `${process.env.JWT_SECRET}`);

        res.cookie("tokenLogin", tokenLogin);
        //return res.json({ message: tokenLogin })

        res.json({
          tokenLogin,
          user: {
            role: user.role,
            
          },
        });
      }
      else {
        res.json({ message: "User desactivated" });
      }
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },

  forgotPasswordWithCode: async (req, res) => {

    try {
      const { email } = req.body;
      if (!email) {
        return res
          .status(400)
          .json({ message: "Email field is empty" });
      }
      User.findOne({ email }).then((user) => {
        if (!user) {
          return res.status(400).json({ error: "User does not exist" });
        }
      });

      //generate random string for activation code
      const activationCodeForgotPass = RandomString.generate({
        length: 4,
        charset: "numeric",
      });
      const tokenForgotPass = jwt.sign(
        { email, activationCodeForgotPass },
        `${process.env.JWT_ACC_ACTIVATE}`,
        { expiresIn: "10m" }
      );

      res.cookie("tokenForgotPass", tokenForgotPass, { expiresIn: "2m" });

      const options = {
        from: `${process.env.EMAIL}`,
        to: email,
        subject: "Confirm your email adress",
        html: `
                <div style = "max-width: 700px;
                              margin: 0 auto;
                              background-color: #fff;
                              box-shadow: 0px 0px 10px rgba(0,0,0,0.1);
                              border-radius: 5px;
                              border: 5px solid #ddd;padding: 50px 20px; font-size: 110%;"
                >
                  <h2 style="font-size: 18px; margin-bottom: 20px; text-align: center; text-align: center; color: #044494"> Welcome to Ordear</h1>
                  <p style="margin-top: 0; margin-bottom: 15;">Just copy the code below in your interface to validate your email address..</p>
                  <a>${activationCodeForgotPass}</a>
                  <p>Equipe Ordear</p>
              </div>
              
               `,
      };

      transporter.sendMail(options, function (err, info) {
        if (err) {
          return res.status(400).json({ error: "Error verifying account" + err });
        } else {
          return res.status(200).json({ message: "An email has been sent" });
        }
      });
    } catch (err) {
      return res.status(500).json({ message: "Something wrong " + err.message });
    }

  },

  verifCodeForgotPassword: async (req, res) => {
    try {
      const tokenForgotPass = req.cookies.tokenForgotPass;

      if (tokenForgotPass) {
        jwt.verify(
          tokenForgotPass,
          `${process.env.JWT_ACC_ACTIVATE}`,
          function (err, decodedTokenForgotPass) {
            if (err) {
              return res
                .status(400)
                .json({ error: "Incorrect or Expired code." });
            }
            const { email, activationCodeForgotPass } = decodedTokenForgotPass;

            User.findOne({ email }).then(async (user) => {
              if (!user) {
                return res
                  .status(400)
                  .json({ error: "User exist." });
              }

              const code = req.body.activationCodeForgotPass;
              if (code !== activationCodeForgotPass) {
                return res.status(400).json({ error: "Mismatch code" });
              }

              res.cookie("tokenForgotPass", tokenForgotPass);

              const options = {
                from: `${process.env.EMAIL}`,
                to: email,
                subject: "Email confirmation",
                html: `
                       <div style="max-width: 700px; margin:auto; border: 5px solid #ddd; padding: 50px 20px; font-size: 110%;">
                       <h2 style="text-align: center; text-transform: uppercase;color: #FF1717;">Welcome to Ordear</h2>
                       <p>Congratulations! 
                          Your adress email has been verified.
                       </p>                          
                     
                       </div>
                       `,
              };

              transporter.sendMail(options, function (err, info) {
                if (err) {
                  return res.status(400).json({ error: "Error verifying account" +err });
                } else {
                  return res.status(200).json({ message: "An email has been sent" });
                }
              });

            });
          }
        );
      }
    } catch (err) {
      return res.status(500).json({ message: "Authentication error" + err.message });
    }
  },

  resetPassword: async (req, res) => {
    try {
      const tokenForgotPass = req.cookies.tokenForgotPass;
      let decodeTokenLogin = jwt_decode(tokenForgotPass);
      let emailUser = decodeTokenLogin.email;

      const confirmPassword = req.body.confirmPassword;
      const password = req.body.password;

      if (!password || !confirmPassword) {
        return res
          .status(400)
          .json({ message: "Not all fields have been entered" });
      }
      if (password != confirmPassword) {
        return res.status(400).json({ error: "Mismatch password" });
      }

      let salt = bcrypt.genSaltSync(10);
      User.updateOne(
        { "email": emailUser }, // Filter
        { $set: { "password": bcrypt.hashSync(password, salt) } } // Update
      )
        .then(() => {
          res.json({ message: "Password updated" })
        })
        .catch((err) => {throw(err);})
    } catch (err) {
      return res.status(500).json({ message: "Password updating error" + err.message });
    }
  },

  logout: async (req, res) => {

    try {
      res.cookie("token", "", {
        httpOnly: true,
        expires: new Date(0),
      });
      res.json({ message: "Logged out" });
    } catch (err) {
      return res.status(500).json({ message: "Logout failed" + err.message });
    }
  },

  // ------------ test pour google connect ---------------
  getProfile: async (req, res) => {
    try {
      User.find({ "id": id })
        .then((docs) => {
          res.send(docs)
        })
        .catch((err) => {
          res
            .status(400)
            .json({ message: "Invalid" + "" + err });
        });

    } catch (err) {
      return res.status(500).json({ message: "Something wrong" + "" + err.message });
    }

  },




}


module.exports = AuthController;
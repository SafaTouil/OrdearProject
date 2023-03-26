const twilio = require('twilio');
const RandomString = require("randomstring");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const jwt_decode = require("jwt-decode");
const multer = require('multer');
const fs = require('fs');
const path = require('path');


const User = require('../models/user.model');
const { Identity } = require('twilio/lib/twiml/VoiceResponse');

// ----------- Multer image ----------------------------
const MIME_TYPES = { //définir les types des images a accepter
  'image/jpg': 'jpg',
  'image/jpeg': 'jpeg',
  'image/png': 'png'
};
const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, './uploads/user/'); //on va stocker les files dans uploads/user
  },
  filename: (req, file, callback) => {
    const name = file.originalname.split(' ').join('_');
    const extension = MIME_TYPES[file.mimetype]; 
    callback(null, name + Date.now() + '.' + extension);
  }
});

const upload = multer({storage:storage}).single("image");

// ----------- Twilio SMS ---------------------
const accountSid = `${process.env.ACCOUNT_SID}`
const authToken = `${process.env.AUTH_TOKEN}`;
const client = twilio(accountSid, authToken);

const userController = {

  addUser: async (req, res) => {
    const { userName, email, password, phone, address, role } = req.body;
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);
    // Créer un nouvel utilisateur
    const newUser = new User({
      userName, email, password: passwordHash, phone, address, role:"preparator", activate:1
    });

    // Enregistrer l'utilisateur dans la base de données
    const savedUser = await newUser.save();
    return savedUser;
  },

  getUser: async (req, res) => {
    try {
      const tokenViewProfile = req.cookies.tokenLogin;
      let decodeTokenLogin = jwt_decode(tokenViewProfile);
      let idUser = decodeTokenLogin.id;

      User.find({ "_id": idUser })
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

  updateUser: async (req, res) => {

    try {
      const tokenProfile = req.cookies.tokenLogin;
      let decodeTokenLogin = jwt_decode(tokenProfile);
      let idUser = decodeTokenLogin.id;

      User.updateOne(
        { "_id": idUser },
        { $set: { "firstName": req.body.firstName, "lastName": req.body.lastName, "address": req.body.address, "birthday": req.body.birthday, "phone": req.body.phone, 'activate': req.body.activate } }

      ).then(() => {
        res.json({ message: "updated" });
      })
        .catch(() => {
          res.json({ message: "not updated" });
        });

    } catch (err) {
      return res.status(500).json({ message: "Something wrong" + "" + err.message });
    }

  },

  updatePassword: async (req, res) => {
    try {
      const tokenProfile = req.cookies.tokenLogin;
      let decodeTokenLogin = jwt_decode(tokenProfile);
      let idUser = decodeTokenLogin.id;

      const confirmPwd = req.body.confirmPassword;
      const newPass = req.body.password;

      if (!newPass || !confirmPwd) {
        return res
          .status(400)
          .json({ message: "Password field is empty" });
      }
      if (newPass != confirmPwd) {
        return res.status(400).json({ error: "Mismatch password" });
      }

      let salt = bcrypt.genSaltSync(10);
      User.updateOne(
        { "_id": idUser }, // Filter par id
        { $set: { "password": bcrypt.hashSync(newPass, salt) }, }
      )
        .then((obj) => {
          return res
            .status(200)
            .json({ message: 'Password updated' });
        })
        .catch((err) => {
          res.json({ message: "Password has not been updated" } + "" + err)
        })
    } catch (err) {
      return res.status(500).json({ message: "Password has not been updated" + err.message });
    }
  },

  sendSMS: async (req, res) => {

    const tokenLogin = req.cookies.tokenLogin;
    let decodeTokenLogin = jwt_decode(tokenLogin);
    let idUser = decodeTokenLogin.id;

    if (idUser != "") {
      const phoneNumber = req.body.phoneNumber;

      const activationCode = RandomString.generate({
        length: 4,
        charset: "numeric",
      });

      function sendSMS(to, message) {

        client.messages
          .create({
            body: message,
            from: '+15077040733',
            to: phoneNumber,
          })
      }
      const tokenSend = jwt.sign(
        { idUser, phoneNumber, activationCode },
        `${process.env.JWT_ACC_ACTIVATE}`,
        { expiresIn: "3m" }
      );
      res.cookie("tokenSend", tokenSend, { expiresIn: "3m" });
      res.json(tokenSend);

      const tokenPhoneNumber = jwt.sign(
        { idUser, phoneNumber },
        `${process.env.JWT_ACC_ACTIVATE}`,
      );

      // Exemple d'utilisation de la fonction d'envoi de SMS
      sendSMS('+15077040733', 'This is your code verification : ' + activationCode);
    } else {
      res
        .status(500)
        .json({ message: "SMS not sent" })
    }
  },

  updatePhone: async (req, res) => {
    try {
      const tokenSend = req.cookies.tokenSend;
      const decodedToken = jwt.verify(tokenSend, process.env.JWT_ACC_ACTIVATE)
      let code = decodedToken.activationCode;
      let phoneNumber = decodedToken.phoneNumber;
      let idUser = decodedToken.idUser;

      const codeActivation = req.body.code;
      if (codeActivation == code) {
        User.updateOne(
          { "_id": idUser },
          { $set: { "phone": phoneNumber } } // Update
        )
          .then((obj) => {
            return res
              .status(200)
              .json({ message: 'Phone number updated' });
          })
          .catch((err) => {
            return res
              .status(400)
              .json({ message: 'Error' + ' ' + err });
          })
      } else {
        res
        .status(500)
        .json({ message: "SMS not sent" })
      }
    } catch (err) {
      return res.status(500).json({ message: "Phone number has not been updated" + err.message });
    }

  }, 

  resend : async (req, res) => {
    const tokenPhoneNumber = req.cookies.tokenPhoneNumber;
    const decodedToken = jwt.verify(tokenPhoneNumber, process.env.JWT_ACC_ACTIVATE)
    let phoneNumber = decodedToken.phoneNumber;
    let idUser = decodedToken.idUser;

    if (idUser) {
      
      const activationCode = RandomString.generate({
        length: 4,
        charset: "numeric",
      });

      function sendSMS(to, message) {

        client.messages
          .create({
            body: message,
            from: '+15077040733',
            to: phoneNumber,
          })
      }
      sendSMS('+15077040733', 'This is your code verification : ' + activationCode);
    } else {
      res
        .status(500)
        .json({ message: "SMS not sent" })
    }
  },
  updateImage: async (req, res) => {  
    try {
      const tokenLogin = req.cookies.tokenLogin;
      let decodeTokenLogin = jwt_decode(tokenLogin);
      let idUser = decodeTokenLogin.id;
      const img =  req?.file?.originalname;

      if(idUser) {       
        User.updateOne(
          { "_id": idUser },
          { $set: { "image":img}} //avoir la valeur du file uploaded  
        ).then(() => {
          res.json({ message: "Image updated" });
        })
          .catch(() => {
            res.json({ message: "Image not updated" });
          });
      }
    }catch (err) {
      return res.status(500).json({ message: "Something wrong " + err.message });
    }

  }

};

module.exports = userController;
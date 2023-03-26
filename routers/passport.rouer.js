const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

const User = require('../models/user.model');

// -------------- Auth google -------------------
const client = new OAuth2Client(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
  );

  //----------- Google connect -----------------------------
router.get('/google', (req, res) => {
    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: ['profile', 'email']
    });
    res.redirect(authUrl);
});
router.get('/google/callback',async (req, res) => { 


  const { code } = req.query;
   const { tokens } = await client.getToken(code);
  
    client.setCredentials(tokens);  
    const oauth2 = google.oauth2({
      auth: client,
      version: 'v2'
});
const { data } = await oauth2.userinfo.get();
  
  console.log(tokens);
  console.log(data);

 if(data.email){
  console.log('user exist')
  res.json({data});
 }

    const newUser = new User({
        "firstName": data.given_name,
        "lastName" : data.family_name,
        "email": data.email,
        "image": data.picture,
        "address":"Montreal, Canada",
        "phone":"+21611111111",
        "activate": 1,
    });
    
    // Enregistrer l'utilisateur dans la base de données
    const savedUser = await newUser.save();
    return savedUser;
    
});

router.get('/dashboard', (req, res) => {
  //res.send(data.name);
  // Récupérer les informations de l'utilisateur à partir de la session
 /* const client = req.session.user;
  if(client) {
  // Afficher les informations de l'utilisateur
  res.send(`Bienvenue ${client.name} !`);
  }else{res.send('Error login')}*/
});

module.exports = router;

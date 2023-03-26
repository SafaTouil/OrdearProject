const express = require('express');
const router = express.Router();
const cookieParser = require("cookie-parser");
const multer = require('multer');

const userController = require('../controllers/user.controller')

router.use(cookieParser());

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

router.post('/addUser', userController.addUser);
router.get('/getUser', userController.getUser);
router.put('/updateUser', userController.updateUser);
router.put('/updatePassword', userController.updatePassword);
router.post('/sendSMS', userController.sendSMS);
router.put('/updatePhone',userController.updatePhone);
router.post('/resend', userController.resend);
router.post('/updateImage', upload, userController.updateImage); //le contenu va être de type file


module.exports = router;
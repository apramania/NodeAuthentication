const User = require('../models/auth.model')
const expressJwt = require('express-jwt')
const _ = require('lodash')
const { OAuth2Client } = require('google-auth-library')
const fetch = require('node-fetch')
const { validationResult  } = require('express-validator')
const jwt = require('jsonwebtoken')
//Custom error handler from database errors
const {errorHandler} = require('../helpers/dbErrorHandling')
//mail system
const sgMail = require('@sendgrid/mail')
//setting the mail key from sgMail
sgMail.setApiKey(process.env.MAIL_KEY)

//Register Controller
exports.registerController = (req, res) => {
    const { name, email, password } = req.body
    //perform express validation
    const errors = validationResult(req)

    if(!errors.isEmpty()){
        const firstError = errors.array().map(error => error.msg)[0]
        return res.status(422).json({
            error: firstError
        })
    }else{
        //check to see if the user with the email exists
        User.findOne({
            email
        }).exec((err, user) => {
            //If user exists
            if(user){
                return res.status(400).json({
                    error: "Email is already taken"
                })
            }
        })
        //if the user is not present then generate a token for the new user
        //Generate JWT token
        const token = jwt.sign(
            {
                name,
                email,
                password
            },
            process.env.JWT_ACCOUNT_ACTIVATION,
            {
                expiresIn: '15m'
            }
        )
        
        //Email sending data
        const emailData = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Account Activation Link',
            html: `
                <h1>Please click the link to activate</h1>
                <p>${process.env.CLIENT_URL}/users/activate/${token}</p>
                </hr>
                <p>This email contains sensitive info</p>
                <p>${process.env.CLIENT_URL}</p>
            `
        }

        sgMail.send(emailData).then(sent => {
            return res.json({
                message: `Email has been sent to ${email}`
            })
        }).catch(err => {
            return res.status(400).json({
                error: errorHandler(err)
            })
        })
    }
}

//Activation of account
exports.activationController = (req, res) => {
    const { token } = req.body;
    console.log(token)
    //check to see if the token exists
    if (token) {
        //we verify token
      jwt.verify(token, process.env.JWT_ACCOUNT_ACTIVATION, (err, decoded) => {
          console.log('1')
        if (err) {
          console.log('Activation error');
          return res.status(401).json({
            errors: 'Expired link. Signup again'
          });
        } else {
            //if it is succesfully verified then we decode the name, email and password from the token
          const { name, email, password } = jwt.decode(token);
  
          console.log(email);
            //Create a new user instance of the model User
          const user = new User({
            name,
            email,
            password
          });
            //Save the instance
          user.save((err, user) => {
              console.log("Inside save")
            if (err) {
              console.log('Save error', errorHandler(err));
              return res.status(401).json({
                errors: errorHandler(err)
              });
            } else {
              return res.json({
                success: true,
                message: user,
                message: 'Signup success'
              });
            }
          });
        }
      });
    } else {
      return res.json({
        message: 'error happening please try again'
      });
    }
  };

//Login controller
  exports.loginController = (req, res) => {
      //destructure the email and password passed in from the body
    const { email, password } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array().map(error => error.msg)[0];
      return res.status(422).json({
        errors: firstError
      });
    } else {
      // check if user exist
      User.findOne({
        email
      }).exec((err, user) => {
        if (err || !user) {
          return res.status(400).json({
            errors: 'User with that email does not exist. Please signup'
          });
        }
        // authenticate
        if (!user.authenticate(password)) {
          return res.status(400).json({
            errors: 'Email and password do not match'
          });
        }
        // generate a token and send to client
        const token = jwt.sign(
          {
            _id: user._id
          },
          process.env.JWT_SECRET,
          {
            expiresIn: '7d'
          }
        );
        const { _id, name, email, role } = user;
  
        return res.json({
          token,
          user: {
            _id,
            name,
            email,
            role
          }
        });
      });
    }
  };
  
//Forgot password controller
  exports.forgotPasswordController = (req, res) => {
    const { email } = req.body;
    const errors = validationResult(req);
  
    if (!errors.isEmpty()) {
      const firstError = errors.array().map(error => error.msg)[0];
      return res.status(422).json({
        errors: firstError
      });
    } else {
        //check to see if email exists
      User.findOne(
        {
          email
        },
        (err, user) => {
          if (err || !user) {
            return res.status(400).json({
              error: 'User with that email does not exist'
            });
          }
            //if exists email, create a token and pass it on to the email
          const token = jwt.sign(
            {
              _id: user._id
            },
            process.env.JWT_RESET_PASSWORD,
            {
              expiresIn: '10m'
            }
          );
  
          const emailData = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: `Password Reset link`,
            html: `
                      <h1>Please use the following link to reset your password</h1>
                      <p>${process.env.CLIENT_URL}/users/password/reset/${token}</p>
                      <hr />
                      <p>This email may contain sensetive information</p>
                      <p>${process.env.CLIENT_URL}</p>
                  `
          };
  
          return user.updateOne(
            {
              resetPasswordLink: token
            },
            (err, success) => {
              if (err) {
                console.log('RESET PASSWORD LINK ERROR', err);
                return res.status(400).json({
                  error:
                    'Database connection error on user password forgot request'
                });
              } else {
                sgMail
                  .send(emailData)
                  .then(sent => {
                    // console.log('SIGNUP EMAIL SENT', sent)
                    return res.json({
                      message: `Email has been sent to ${email}. Follow the instruction to activate your account`
                    });
                  })
                  .catch(err => {
                    // console.log('SIGNUP EMAIL SENT ERROR', err)
                    return res.json({
                      message: err.message
                    });
                  });
              }
            }
          );
        }
      );
    }
  };

  exports.resetPasswordController = (req, res) => {
    const { resetPasswordLink, newPassword } = req.body;
  
    const errors = validationResult(req);
  
    if (!errors.isEmpty()) {
      const firstError = errors.array().map(error => error.msg)[0];
      return res.status(422).json({
        errors: firstError
      });
    } else {
        //if reset password is set then verify the token
      if (resetPasswordLink) {
        jwt.verify(resetPasswordLink, process.env.JWT_RESET_PASSWORD, function(
          err,
          decoded
        ) {
          if (err) {
            return res.status(400).json({
              error: 'Expired link. Try again'
            });
          }
            //check if the password was set
          User.findOne(
            {
              resetPasswordLink
            },
            (err, user) => {
              if (err || !user) {
                return res.status(400).json({
                  error: 'Something went wrong. Try later'
                });
              }
                //updating the fields
              const updatedFields = {
                password: newPassword,
                resetPasswordLink: ''
              };
  
              user = _.extend(user, updatedFields);
  
              user.save((err, result) => {
                if (err) {
                  return res.status(400).json({
                    error: 'Error resetting user password'
                  });
                }
                res.json({
                  message: `Great! Now you can login with your new password`
                });
              });
            }
          );
        });
      }
    }
  };

  const client = new OAuth2Client(process.env.GOOGLE_CLIENT);
  // Google Login
exports.googleController = (req, res) => {
    const { idToken } = req.body;
  
    client
      .verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT })
      .then(response => {
        // console.log('GOOGLE LOGIN RESPONSE',response)
        const { email_verified, name, email } = response.payload;
        if (email_verified) {
          User.findOne({ email }).exec((err, user) => {
            if (user) {
              const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
                expiresIn: '7d'
              });
              const { _id, email, name, role } = user;
              return res.json({
                token,
                user: { _id, email, name, role }
              });
            } else {
              let password = email + process.env.JWT_SECRET;
              user = new User({ name, email, password });
              user.save((err, data) => {
                if (err) {
                  console.log('ERROR GOOGLE LOGIN ON USER SAVE', err);
                  return res.status(400).json({
                    error: 'User signup failed with google'
                  });
                }
                const token = jwt.sign(
                  { _id: data._id },
                  process.env.JWT_SECRET,
                  { expiresIn: '7d' }
                );
                const { _id, email, name, role } = data;
                return res.json({
                  token,
                  user: { _id, email, name, role }
                });
              });
            }
          });
        } else {
          return res.status(400).json({
            error: 'Google login failed. Try again'
          });
        }
      });
  };

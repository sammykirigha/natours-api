const crypto = require('crypto')
const {promisify} = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModels');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');

const signToken = (id) => {
 return jwt.sign({ id }, process.env.JWT_SECRETE, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id)
  
  const cookieOptions = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
    httpOnly: true
  }
  if(process.env.NODE_ENV === 'production') cookieOptions.secure = true
  res.cookie('jwt', token, cookieOptions ) 
  //remove the password from the output
  user.password = undefined;
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    },
  });
}


exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);
  createSendToken(newUser, 201, res)
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  //1 check if there is email and passwword
  if (!email || !password) {
    return next(new AppError('Please provide an email and password', 400));
  }

  //2 check if the password && user exists
  const user = await User.findOne({ email }).select('+password');
  console.log(user);



  if (!user || (!await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password!..', 401));
  }

  const isPasswordCorrect = await user.correctPassword(password, user.password)
  console.log('isCorrectPassword', isPasswordCorrect)

  //3 check if evrything is correct, send token to client
  createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
   // 1.) getting the token and checks if it is there
   let token;
   if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
     token = req.headers.authorization.split(' ')[1]
   }
 
  if(!token){
    return next(new AppError('You are not logged in!.Please log in to get access.', 401))
  }

  // 2.) verification of token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRETE);
   
  // 3.) check if the user still exist
  const currentUser = await User.findById(decoded.id)
  if (!currentUser) {
    return next(new AppError('The user belonging to this token does no longer exist!', 401))
  }

  // 4.) check if the user changed the password after the token was issued
  if(currentUser.changedPasswordAfter(decoded.iat)){
    return next(new AppError('User recently changed password. Please login again!', 401))
  }
  //GRANT ACCESS TO PROTECT THE ROUTE
  req.user = currentUser
  next();
})

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin' 'lead-guide']. role = 'user'
    if(!roles.includes(req.user.role)){
      return next(new AppError('You do not have permission to perform this action', 403))
    }

    next()
  } 
}

exports.forgotPassword = catchAsync( async (req, res, next) => {
  //1.) get user based on posted email
   const user = await User.findOne({email: req.body.email})
   if (!user) {
       return next(new AppError('There is no user with that email addresss', 404))
   }

  //2. ) generate a random reset token 
  const resetToken = user.createPasswordResetToken();
  await user.save({validateBeforeSave: false})

  //3.) send the email
  const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`
  const message = `Forget your password? Submit your patch request with your new password and passwordConfirm to: ${resetURL}.
  \nIf you did not forget your password please ignore your this email.`;
  
  try {
    await sendEmail({
      email: user.email,
      subject: 'Your reset password token is (valid for 10 min)',
      message
    })
  
    res.status(200).json({
      status: 'success',
      message: 'Token sent to your email'
    })
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({validateBeforeSave: false});

    return next(new AppError('There was an error sending an email. Try again later!'), 500)
  }
  
});

exports.resetPassword = catchAsync(async(req, res, next) => {
  //1). Get the user based on token
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex')
  const user = await User.findOne({passwordResetToken: hashedToken, passwordResetExpires: {$gt: Date.now()}
})
  //2). If token has not expired, and the user exist then set the new password
  if (!user) {
    return next(new AppError('Token is invalid or expired', 400))
  }
  user.password = req.body.password;
  user.confirmPassword = req.body.confirmPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined
  await user.save();
  //3). Update changedPasswordAt property for the user
  //4). Log in the user, send JWT
  createSendToken(user, 200, res);
});

exports.updatedPassword = catchAsync( async (req, res, next) => {
//1). Get the user from the collection
const user = await User.findById(req.user.id).select('+password')

//2). Check if posted current password is correct
if(!(await user.correctPassword(req.body.passwordCurrent, user.password))){
  return next(new AppError('Your current password is wrong', 401))
}

//3). if so, update the password
user.password = req.body.password;
user.confirmPassword = req.body.confirmPassword
await user.save();
//4). Log the user in
createSendToken(user, 200, res)

})

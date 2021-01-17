const User = require('../models/userModels');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory  = require('./handlerFactory');

const filterObj = (obj, ...allowedFields) => {
  const newObj = {}
  Object.keys(obj).forEach(el => {
    if(allowedFields.includes(el)) newObj[el] = obj[el]
  })
  return newObj
}

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next()
}


exports.updateMe = catchAsync(async (req, res, next) => {
  //1). create an error if a user updates the password data
  if(req.body.password || req.body.confirmPassword){
    return next(new AppError('This route is not for password updates!.Please us /updateMyPassword route', 400))
  }
  //2). filter out field names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'name', 'email')
  //3). update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {new: true, runValidators: true})
  
  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  })
});

exports.deleteMe = catchAsync(async(req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, {active: false})
  res.status(204).json({
    status: 'success',
    data: null
  })
})




exports.createUsers = (req, res) => {
  res.status(500).json({
    status: 'err',
    message: 'This route is not definied.Please use this rout /signup instead',
  });
};
exports.getUser = factory.getOne(User);  
exports.getAllUsers = factory.getAll(User);
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);

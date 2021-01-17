const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp')

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRouter');
const userRouter = require('./routes/userRouter');
const reviewRouter = require('./routes/reviewRouter');

const app = express();

//Global middlewares
//security 
app.use(helmet())

//development login
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

//setting the limit
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour.'
})

app.use('/api', limiter)

//body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb'}));

//Data sanitization against NoSQL querry injections
app.use(mongoSanitize())

//Data sanitization against XSS attacks
app.use(xss())

//prevent parameter pollution
app.use(hpp({
  whitelist: ['duration', 'ratingsAverage', 'ratingQuantity', 'maxGroupSize', 'difficulty', 'price']
}));

//serving static files
app.use(express.static(`${__dirname}/public`));

//test middlewares
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.headers)
  next();
});

//Routes

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

app.all('*', (req, res, next) => {
  next(
    new AppError(`Could not find ${req.originalUrl} on this server!..`, 400)
  );
});

app.use(globalErrorHandler);

module.exports = app;

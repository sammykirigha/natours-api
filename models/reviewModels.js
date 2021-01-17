const mongoose = require('mongoose');
const { findByIdAndDelete } = require('./tourModels');
const Tour = require('./tourModels')

const reviewSchema = new mongoose.Schema({
 review: {
     type: String,
     required: [true, 'Review can not be empty']
 },
 rating: {
    type: Number,
    default: 4.5,
    min: 1,
    max: 5
 },
 createAt: {
     type: Date,
     default: Date.now()

 },
 tour: {
     type: mongoose.Schema.ObjectId,
     ref: 'Tour',
     required: [true, 'Review must belong to tour']
 },
 user: {
     type: mongoose.Schema.ObjectId,
     ref: 'User',
     required: [true, 'Review must belong to user']
 }
},
{
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  })


reviewSchema.pre(/^find/, function(next) {
    // this.populate({
    //     path: 'tour',
    //     select: 'name'
    // }).populate({
    //     path: 'user',
    //     select: 'name photo'
    // })
    // next()

    this.populate({
        path: 'user',
        select: 'name photo'
    })
    next()
})

reviewSchema.statics.calcAverageRatings = async function(tourId){
    
    const stats = await this.aggregate([
        {
            $match: {tour: tourId}
        },
        {
            $group: {
                _id: '$tour',
                nRating: {$sum: 1},
                avgRatings: {$avg: '$rating'}
            }
        }
    ])
    // console.log(stats)
    if(stats.length > 0) {
        await Tour.findByIdAndUpdate(tourId, {
            ratingQuantity: stats[0].nRating,
            ratingsAverage: stats[0].avgRatings
        })
    }else {
        await Tour.findByIdAndUpdate(tourId, {
            ratingQuantity: 0,
            ratingsAverage: 4.5
        })
    }
    
}

reviewSchema.post('save', function(){
    //this points to the current review
    this.constructor.calcAverageRatings(this.tour)
    
})

//findByIdAndUpdate
// findByIdAndDelete

reviewSchema.pre(/^findOneAnd/, async function(next) {
 this.r = await this.findOne()
//  console.log(this.r)
    next()
})

reviewSchema.pre(/^findOneAnd/, async function() {
    // this.r = await this.findOne() does Not work here query has already excuted
    await this.r.constructor.calcAverageRatings(this.r.tour)
     
})


const Review = mongoose.model('Review', reviewSchema)

module.exports = Review
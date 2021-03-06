const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const Ads = mongoose.model(
  "Ads",
  new Schema(
    {
      permlink:String,
      author:String,
      postCreation:Date,
      title:String,
      image:String,
      date: Date
    },
    { collection: "ads" }
  )
);

module.exports = Ads;

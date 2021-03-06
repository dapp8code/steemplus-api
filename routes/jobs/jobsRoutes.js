const config = require("../../config.js");
const spp = require("../../controllers/jobs/spp.js");
const vote = require("../../controllers/jobs/vote.js");
const poststats = require("../../controllers/jobs/poststats.js");
const premium = require("../../controllers/jobs/premium.js");
const steemplusPay = require("../../controllers/jobs/steemplusPay.js");
const ads = require("../../controllers/jobs/ads.js");
const utils = require("../../utils.js");
const replay=require("../api/replay.js")
const steem = require("steem");
const VOTING_ACCOUNT = "steem-plus";
const ADS_FEE=25;
let payDelegationsStarted = false;
let growStarted = false;
let updateSteemplusPointsStarted = false;
let botVoteStarted = false;
let weeklyRewardsStarted = false;
let postStatsStarted = false;
let debitPremiumStarted = false;
let newAdsStarted = false;

const jobRoutes = function(app) {
  // Method used to give user rewards depending on delegations
  app.get("/job/pay-delegations/:key", async function(req, res) {
    if (req.params.key !== config.key) {
      res.status(403).send("Permission denied");
      return;
    }
    if(payDelegationsStarted||replay.hasReplayStarted()) {
      res.status(403).send("Pay delegation already started");
      return;
    }
    payDelegationsStarted = true;
    res.status(200).send("OK");
    await spp.payDelegations();
    payDelegationsStarted = false;
  });

  app.get("/job/grow/:key", async function(req, res) {
    if (req.params.key !== config.key) {
      res.status(403).send("Permission denied");
      return;
    }
    if(growStarted||replay.hasReplayStarted()) {
      res.status(403).send("Grow already started");
      return;
    }
    growStarted = true;
    res.status(200).send("OK");
    await steemplusPay.grow();
    growStarted = false;
  });

  // This function is used to pay the weekly rewards to users
  // Function executed everyday but effective every monday
  app.get("/job/pay-weekly-rewards/:key", async function(req, res) {
    if (req.params.key !== config.key) {
      res.status(403).send("Permission denied");
      return;
    }
    if(weeklyRewardsStarted||replay.hasReplayStarted()) {
      res.status(403).send("Weekly rewards already started");
      return;
    }
    weeklyRewardsStarted = true;
    res.status(200).send("OK");
    await spp.payWeeklyRewards();
    weeklyRewardsStarted = false;
  });

  app.get("/job/claimAccounts/:key", async function(req, res) {
    if (req.params.key !== config.key) {
      res.status(403).send("Permission denied");
      return;
    }
    res.status(200).send("OK");
    await spp.claimAccounts();
  });

  // This function is used to update steemplus point.
  // Function executed every hour.
  // Only get the results since the last entry.
  app.get("/job/update-steemplus-points/:key", async function(req, res) {
    // If key is not the right key, permission denied and return
    if (req.params.key !== config.key) {
      res.status(403).send("Permission denied");
      return;
    }
    if(updateSteemplusPointsStarted||replay.hasReplayStarted()) {
      res.status(403).send("Update Steemplus Points already started");
      return;
    }
    updateSteemplusPointsStarted = true;
    res.status(200).send("OK");
    await spp.updateSteemplusPoints();
    console.log("Finished")
    updateSteemplusPointsStarted = false;
  });

  // Bot for Steemplus daily vote
  app.get("/job/bot-vote/:key", function(req, res) {
    if (req.params.key !== config.key) {
      res.status(403).send("Permission denied");
      return;
    }
    if(botVoteStarted||replay.hasReplayStarted()) {
      res.status(403).send("Bot vote already started");
      return;
    }
    botVoteStarted = true;
    // get Steem-plus voting power
    steem.api.getAccounts([VOTING_ACCOUNT], async function(err, result) {
      if (err) {
        console.log(err);
        botVoteStarted = false;
      }
      else {
        let spAccount = result[0];
        // Only start voting if the voting power is full
        if (
          (utils.getVotingPowerPerAccount(spAccount) > 99.87 ||
            process.env.FORCE_VOTE === "true") &&
          process.env.CAN_VOTE === "true"
        ) {
          console.log("start voting...");
          res.status(200).send("OK");
          await vote.startBotVote(spAccount);
          botVoteStarted = false;
        } else {
          if (process.env.CAN_VOTE === "false") {
            console.log("Voting bot disabled...");
            botVoteStarted = false;
            res.status(200).send("Voting bot disabled...");
          } else {
            let votingPowerSP = utils.getVotingPowerPerAccount(spAccount);
            console.log(
              `Voting power (mana) is only ${votingPowerSP}%... Need to wait more`
            );
            res
              .status(200)
              .send(
                `Voting power (mana) is only ${votingPowerSP}%... Need to wait more`
              );
            botVoteStarted = false;
          }
        }
      }
    });
  });


  app.get("/job/post-stats/:key", async function(req, res){
    if (req.params.key !== config.key) {
      res.status(403).send("Permission denied");
      return;
    }
    if(postStatsStarted||replay.hasReplayStarted()) {
      res.status(403).send("Post Stats already started");
      return;
    }
    postStatsStarted = true;
    res.status(200).send(await poststats.getPostStats());
    postStatsStarted = false;
  });

  // Method used to debit SPP for premium features
  // Function executed every hour
  app.get("/job/debit-premium/:key", async function(req, res) {
    if (req.params.key !== config.key) {
      res.status(403).send("Permission denied");
      return;
    }
    if(debitPremiumStarted||replay.hasReplayStarted()) {
      res.status(403).send("Debit premium already started");
      return;
    }
    debitPremiumStarted = true;
    res.status(200).send("OK");
    await premium.debitPremium();
    debitPremiumStarted = false;
  });

  // Routine for checking for new ad campaigns
  app.get("/job/newAds/:key", async function(req, res) {
    if (req.params.key !== config.key) {
      res.status(403).send("Permission denied");
      return;
    }
    if(newAdsStarted||replay.hasReplayStarted()) {
      res.status(403).send("New Ads Job already started");
      return;
    }
    newAdsStarted = true;
    res.status(200).send("OK");
    await ads.add();
    newAdsStarted = false;
  });
};

module.exports = jobRoutes;

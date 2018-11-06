const RequestHelper = require('../helpers/request_helper.js');
const PubSub = require("../helpers/pub_sub.js");

const Game = function () {
  this.newDeckUrl = 'https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=6';
  this.requestDeck = new RequestHelper(this.newDeckUrl);
  this.roundObject = {};

}

Game.prototype.bindEvents = function () {
  const playAgainButton = document.querySelector("#play-again-button");
  playAgainButton.addEventListener("click", () => {
    this.dealCards(this.deckId);
  });

  PubSub.subscribe("ResultView:hit-button-click", () => {
    this.drawOneCard(this.roundObject.playerCards, `player`)
  });

  PubSub.subscribe("ResultView:stick-button-click", () => {
    PubSub.publish(`Game:dealer-drawn-card-ready`, this.roundObject.dealerCards);
    setTimeout(() => {
      console.log(this);
      this.renderDealerAction(this.roundObject.dealerCards);
    }, 1000);
  });
};

Game.prototype.getShuffledDeck = function () {
  this.requestDeck.get()
    .then((shuffledDeck) => {
      this.newCardsUrl = `https://deckofcardsapi.com/api/deck/${ shuffledDeck.deck_id }/draw/?count=2`;
      this.deckId = shuffledDeck.deck_id;
      return shuffledDeck.deck_id;
    })
    .then((deckId) => {
      this.dealCards(deckId);
    })
}

Game.prototype.dealCards = function (deckId) {
  this.requestCards = new RequestHelper(this.newCardsUrl);
  this.requestCards.get()
    .then((drawnCards) => {
      this.convert(drawnCards.cards)
      this.roundObject.playerCards = drawnCards.cards;
      PubSub.publish("Game:player-cards-ready", this.roundObject.playerCards);
    })
    .then(() => {
      this.requestCards.get()
        .then((drawnCards) => {
          this.convert(drawnCards.cards)
          this.roundObject.dealerCards = drawnCards.cards;
          PubSub.publish("Game:dealer-cards-ready", this.roundObject.dealerCards);
          this.blackJackChecker(this.roundObject);
        });
    })
};

Game.prototype.drawOneCard = function (array, actor) {
  this.drawOneUrl = `https://deckofcardsapi.com/api/deck/${ this.deckId }/draw/?count=1`;
  this.requestOneCard = new RequestHelper(this.drawOneUrl);
  this.requestOneCard.get()
    .then((cardObject) => {
      this.convert(cardObject.cards);
      array.push(cardObject.cards[0]);
      PubSub.publish(`Game:${ actor }-drawn-card-ready`, array);
      this.bustChecker(this.roundObject);
      return array;
    })
    .then((array) => {
      if (actor == `dealer`) {
        this.renderDealerAction(array)
      }
    })
};

Game.prototype.renderDealerAction = function (array) {
  if (this.getHandTotal(array) <= 16) {
    this.drawOneCard(array, `dealer`)
  }
  else{
  this.getResult(this.roundObject)};
};

Game.prototype.convert = function (drawnCards) {
  drawnCards.forEach((cardObject) => {
    if ((cardObject.value === "JACK") || (cardObject.value === "QUEEN") || (cardObject.value === "KING")) {
      cardObject.value = "10";
    }
    else if (cardObject.value === "ACE") {
      cardObject.value = "11";
    }
  });
};

Game.prototype.getResult = function (roundObject) {
  const playerTotal = this.getHandTotal(roundObject.playerCards)
  const dealerTotal = this.getHandTotal(roundObject.dealerCards)

  whoWon = "";

  if (playerTotal > 21) {
    whoWon = "You went Bust!"
  }
  else if (dealerTotal > 21) {
    whoWon = "Dealer went Bust!"
  }
  else if (dealerTotal > playerTotal) {
    whoWon = "Dealer wins!"
  }
  else if (playerTotal > dealerTotal) {
    whoWon = "You win!";
  }
  else {
    whoWon = "It's a draw!"
  }

  PubSub.publish("Game:result-loaded", whoWon);
};

Game.prototype.getHandTotal = function (array) {
  total = 0;
  array.forEach((card) => {
    total += Number(card.value)
  });
  return total;
};

Game.prototype.blackJackChecker = function (roundObject) {
  const playerTotal = this.getHandTotal(roundObject.playerCards)
  const dealerTotal = this.getHandTotal(roundObject.dealerCards)
  if ((playerTotal == 21) || (dealerTotal == 21)) {
    this.getResult(roundObject);
    PubSub.publish(`Game:dealer-drawn-card-ready`, this.roundObject.dealerCards);
  }
  else {
    this.renderChoice(roundObject);
  }
};

Game.prototype.renderChoice = function (roundObject) {
  PubSub.publish("Game:choice-loaded");
}

Game.prototype.bustChecker = function (roundObject) {
  console.log('bustcheker should be sued everytime you get a card');
  // if ((this.getHandTotal(roundObject.playerCards) > 21) || (this.getHandTotal(roundObject.dealerCards) > 21)) {
  //   console.log('roundboject:',roundObject);
  //   this.checkForEleven();
  // };



  if (this.getHandTotal(roundObject.playerCards) > 21) {
    this.checkForEleven(roundObject.playerCards);
  }
  else if (this.getHandTotal(roundObject.dealerCards) > 21) {
    this.checkForEleven(roundObject.dealerCards);
  }

};

Game.prototype.checkForEleven = function (cards) {
  console.log('check for eleven has been called. someone went bust');

  console.log('cards:', cards);
  const elevenCard = cards.find( card => card.value == "11");
  console.log('elevencard:',elevenCard);
  if (elevenCard != undefined) {
    elevenCard.value = "1"
    console.log('you had an ace. you are now swelllll');
  }
  else {
    console.log('no ace. you are really bust');
    this.getResult(this.roundObject);
  };
};


module.exports = Game;

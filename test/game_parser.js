var expect = require('chai').expect;
var gameParser = require('../lib/game_parser');
var games = require('./mock/games.json');
describe('game_parser', function() {
  it.only('should parse games', function () {
    var parse = gameParser(games);
    expect(parse).to.exist;
  });
});
describe('Avatar', function() {
  it('should get image', function () {
    var player = require('./mock/info.json');
    console.log(player);
  });
});

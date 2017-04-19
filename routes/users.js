var express = require('express');
var router = express.Router();
var querystring = require('querystring');
var request = require('request');
var cookieParser = require('cookie-parser');

var client_id = '31570205e3904dbf83793b2818311a9b';
var client_secret = '5084dd3331454d2ab7eda0b4669ddd1b';
var redirect_uri = 'http://localhost:8888/users/callback';


var generateRandomString = function(length){
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghipqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('users are here');
});

router.get('/login', function(req, res) {
  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email';
  res.redirect('https://accounts.spotify.com/authorize?' +
               querystring.stringify({
                 response_type: 'code',
                 client_id: client_id,
                 scope: scope,
                 redirect_uri: redirect_uri,
                 state: state
               }));
});

router.get('/callback', function(req, res) {
  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
                 querystring.stringify({
                   error: 'state_mismatch'
                 }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {

      var access_token = body.access_token,
          refresh_token = body.refresh_token;

      res.cookie('access_token', access_token);
      res.cookie('refresh_token', refresh_token);

      var options = {
        url: 'https://api.spotify.com/v1/me',
        headers: { 'Authorization': 'Bearer ' + access_token },
        json: true
      };

      // use the access token to access the Spotify Web API
      request.get(options, function(error, response, body) {
        console.log(body);
        res.render('user', body);
      });

    } else {
      res.redirect('/#' + querystring.stringify({error: 'invalid_token'}));
    }
  });
});

router.get('/new-releases', function(req, res){
  var access_token = req.cookies['access_token'];
  var options = {
    url: 'https://api.spotify.com/v1/browse/new-releases',
    headers: { 'Authorization': 'Bearer ' + access_token },
    json: true
  };

  request.get(options, function(error, response, body) {
    console.log(body.albums);
    res.render('new_releases', { albums: body.albums.items,
                                 back: body.previous,
                                 next: body.next });
  });
});

router.get('/refresh-token', function(req, res) {
  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token

    },
    json: true

  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token

      });

    }

  });

});

module.exports = router;

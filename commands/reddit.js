var _ = require('lodash');
var request = require('request');

module.exports = function (commander, logger) {

    var postTemplate = _.template("<b><%= title %></b> <%= url %>");
    var allowNSFW = false;

    commander.script({
        help: 'Call up all sorts of reddit schenanigans'
    });

    commander.spy({
        hear: /^r\/(top|hot|rising|controversial)?$/,
        help: 'Lists the top post from a subreddit',
        action: function(event, response) {
            doRedditRequest({
                sub: "all",
                sort: event.captures.length ? event.captures[0] : ""
            }, renderPosts(1, function(content) {
                response.send(content);
            }));
        }
    });

    commander.spy({
        hear: /^r\/([\w\-]+)\/?(top|hot|rising|controversial)?$/,
        help: 'Lists the top post from a subreddit',
        action: function(event, response) {
            var sub = (event.captures.length) ? event.captures[0] : "all";
            var sort = (event.captures.length > 1) ? event.captures[1] : "";
            doRedditRequest({
                sub: sub,
                sort: sort
            }, renderPosts(1, function(content) {
                response.send(content);
            }));
        }
    });

    function renderPosts(count, callback) {
        return function(err, posts) {
            if (err) return logger.error(err.stack || err);
            if (posts.length) {

                var html = [];

                if (!allowNSFW) {
                    posts = _.filter(posts, function(post) {
                        return !post.data.over_18;
                    });
                }

                for (var i = 0; i < count; i++) {
                    if (i < posts.length) {
                        html.push(postTemplate(posts[i].data))
                    }
                }

                callback(html.join("<hr>"));
            } else {
                callback("No posts in this subreddit. (sadpanda)");
            }
        }
    }

    function doRedditRequest(params, callback) {

        request.get({
            url: getRedditUrlForParams(params),
            json: true
        }, function(err, res, json) {
            if (err) {
                return callback(err);
            }

            callback(null, (json.data && json.data.children && json.data.children.length) ? json.data.children : []);
        });
    }

    function getRedditUrlForParams(params) {
        var url = "http://www.reddit.com/";

        if (params.sub) {
            url += "r/" + params.sub;
        }

        if (params.sort) {
            url += "/" + params.sort;
        }

        url += "/.json";

        return url;
    }
};
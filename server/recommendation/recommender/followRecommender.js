'use strict';

const _ = require('lodash');
const debug = require('debug')('recommend:follow');

const followModel = require('../../follow/followModel');
const listenModel = require('../../listen/listenModel');
const explanation = require('../explanation');

const recommender = module.exports = {};

recommender.checkSupported = function (user) {
	// only requires that user follows someone else
	return followModel.getFollowees(user).then(follows => follows.length > 0);
};

recommender.recommend = function (user, recentRecommendations) {
	return Promise.all([
		listenModel.getMusicByListener(user).then(musicList => _.countBy(musicList)),
		followModel.getFollowees(user) // could descend further if need be
	]).then(([listenedMap, follows]) => {
		return findMusicForFollows(follows).then((followedMusicWithUser) => {
			debug('followed music', followedMusicWithUser);

			const newFollowedMusic = _.reject(followedMusicWithUser, (musicWithUser) => {
				const alreadyListened = listenedMap[musicWithUser.music];
				const recommendationOverlap = _.includes(recentRecommendations, musicWithUser.music);
				return alreadyListened || recommendationOverlap;
			});
			if (!newFollowedMusic.length) {
				return null;
			}

			const recommended = _.first(newFollowedMusic); // better would be choosing song most listened among followers
			debug('followRecommender recommended', recommended);
			return {
				music: recommended.music,
				explanation: explanation.follow(recommended.user)
			};
		});
	});
};

function findMusicForFollows(follows) {
	const users = _.map(follows, 'to');
	return listenModel.getMusicByListeners(users).then((music) => {
		return _.uniq(music);
	});
}

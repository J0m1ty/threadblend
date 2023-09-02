import { ExtendedClient } from "./../structures";

module.exports = {
	name: 'ready',
	once: true,
	execute(client: ExtendedClient) {
		console.log(`Ready! Logged in as ${client.user!.tag}`);
	},
};
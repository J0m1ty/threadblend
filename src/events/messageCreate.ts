import { Message } from "discord.js";
import { builtins } from "../util";
import { ExtendedClient, GuildData, UserData } from "../structures";

module.exports = {
	name: 'messageCreate',
    async execute(message: Message) {
        if (message.interactionMetadata || !message.inGuild() || message.author.bot) return;

        let user: UserData | null = await (message.client as ExtendedClient).db.get(`users.${message.author.id}`);

        if (!user) {
            user = {
                alarms: [],
                joined: Date.now(),
                lastSeen: Date.now(),
                nmessages: 0
            }
        }

        user.lastSeen = Date.now();
        user.nmessages++;

        await (message.client as ExtendedClient).db.set(`users.${message.author.id}`, user);
        
        let guild: GuildData | null = await (message.client as ExtendedClient).db.get(message.guildId);

        if (!guild) return;

        let channel = guild.channels[message.channelId];

        if (!channel) return;

        channel.plugins.forEach(async (plugin) => {
            if (!plugin.enabled) return;

            switch (plugin.name) {
                case 'rules':
                    plugin.rules.forEach(async (rule) => {
                        const builtin = builtins.find(r => r.name === rule.name);

                        if (!builtin) return;

                        const messageContent = builtin.usesMessage ? message : message.content;
                        if (message.deletable && !await builtin.process(messageContent as Message<boolean> & string)) {
                            try {
                                await message.delete();
                            } catch (ignored) {
                                /* most likely missing perms */
                            }
                        }
                    });
                    break;
                case 'statistics':
                    plugin.nmessages++;
                    plugin.nwords += message.content.split(' ').length;
                    if (!plugin.nparticipants.includes(message.author.id)) plugin.nparticipants.push(message.author.id);
                    break;
                case 'export':
                    if (message.content.length < plugin.maxMessageLength && message.content.length > 0) {
                        plugin.messages.unshift(message.content);
                    }
                    break;
            }
        });

        await (message.client as ExtendedClient).db.set(message.guildId, guild);
    }
};
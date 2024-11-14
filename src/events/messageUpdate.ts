import { Message } from "discord.js";
import { builtins } from "../util";
import { ExtendedClient, GuildData, UserData } from "../structures";

module.exports = {
	name: 'messageUpdate',
    async execute(oldMessage: Message, newMessage: Message) {
        if (newMessage.interactionMetadata || !newMessage.inGuild() || newMessage.author.bot) return;

        let user: UserData | null = await (newMessage.client as ExtendedClient).db.get(`users.${newMessage.author.id}`);

        if (!user) {
            user = {
                alarms: [],
                joined: Date.now(),
                lastSeen: Date.now(),
                nmessages: 0
            }
        }
        
        user.lastSeen = Date.now();

        await (newMessage.client as ExtendedClient).db.set(`users.${newMessage.author.id}`, user);

        let guild: GuildData | null = await (newMessage.client as ExtendedClient).db.get(newMessage.guildId);

        if (!guild) return;

        let channel = guild.channels[newMessage.channelId];

        if (!channel) return;
        
        channel.plugins.forEach(async (plugin) => {
            if (plugin.enabled && plugin.name == 'rules') {
                plugin.rules.forEach(async (rule) => {
                    const builtin = builtins.find(r => r.name === rule.name);

                    if (!builtin) return;

                    const messageContent = builtin.usesMessage ? newMessage : newMessage.content;
                    if (newMessage.deletable && !await builtin.process(messageContent as Message<boolean> & string)) {
                        try {
                            await newMessage.delete();
                        } catch (ignored) {
                            /* most likely missing perms */
                        }
                    }
                });
            }
        });
    }
};
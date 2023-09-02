import { ChatInputCommandInteraction, GuildTextBasedChannel, SlashCommandBuilder } from 'discord.js';
import { ChannelRules, Command, ExtendedClient, GuildData } from '../structures';
import { builtins } from '../util';

const command: Command = {
    plugin: 'export',
    data: new SlashCommandBuilder()
        .setName('export')
        .addStringOption(option =>
            option
                .setName('seperator')
                .setDescription('The seperator to use between messages (can wrap in double quotes)'))
        .addIntegerOption(option =>
            option
                .setName('nmessages')
                .setDescription('The number of messages to export (relative to the most recent message)'))
        .addBooleanOption(option =>
            option
                .setName('reverse')
                .setDescription('Reverse the order of the messages (newest first)'))
        .addBooleanOption(option =>
            option
                .setName('conform')
                .setDescription('Conform the messages to the channel\'s format rules'))
        .setDescription('Export a channel\'s message history'),
    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.inGuild() || !interaction.channel) return;

        let guild: GuildData | null = await (interaction.client as ExtendedClient).db.get(interaction.guildId);

        if (!guild) return;

        let channel = guild.channels[interaction.channelId];

        if (!channel) return;

        let plugin = channel.plugins.find(p => p.name === 'export');

        if (!plugin || plugin.name !== 'export') return;

        if (plugin.dirty) {
            await interaction.reply({ content: ':warning: Please wait for this plugin to finish loading.', ephemeral: true });
            return;
        }
        
        const seperator = (interaction.options.getString('seperator') ?? '\n').replace(/^"(.+(?="$))"$/, '$1');

        const nmessages = interaction.options.getInteger('nmessages') ?? Infinity;

        const reverse = !(interaction.options.getBoolean('reverse') ?? false);
        
        let messages: string[] = plugin.messages.map(m => m.trim());

        let failed = false;
        if (interaction.options.getBoolean('conform') ?? false) {
            let rules = channel.plugins.find(p => p.name === 'rules');

            if (rules && rules.name === 'rules') {
                messages = messages.filter(m => {
                    for (let rule of (rules as ChannelRules).rules) {
                        const builtin = builtins.find(r => r.name === rule.name);

                        if (!builtin || builtin.usesMessage) continue;

                        if (!builtin.process(m)) return false;
                    }

                    return true;
                });
            }
            else if (interaction.options.getBoolean('conform') != undefined) {
                failed = true;
            }
        }
        
        messages = messages.slice(0, Math.min(plugin.messages.length, nmessages));

        if (reverse) messages.reverse();

        const failedMessage = failed ? '\n\n:warning: Could not find any channel format rules to conform to!' : '';

        await interaction.reply({ content: `Exported \`${messages.length}\` messages.${failedMessage}`, files: [{ attachment: Buffer.from(messages.join(seperator)), name: 'export.txt' }], ephemeral: true });
    },
};

export = command;
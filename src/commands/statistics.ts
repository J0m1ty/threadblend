import { ChatInputCommandInteraction, ColorResolvable, EmbedBuilder, PermissionsBitField, SlashCommandBuilder } from 'discord.js';
import { Command, ExtendedClient, GuildData, Rule } from 'src/structures';
import { color } from '../config.json';

const command: Command = {
    plugin: 'statistics',
    data: new SlashCommandBuilder()
        .setName('statistics')
        .setDescription('View channel statistics'),
    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.inGuild() || !interaction.channel) return;

        let guild: GuildData | null = await (interaction.client as ExtendedClient).db.get(interaction.guildId);

        if (!guild) return;

        let channel = guild.channels[interaction.channelId];

        if (!channel) return;

        let plugin = channel.plugins.find(p => p.name === 'statistics');

        if (!plugin || plugin.name !== 'statistics') return;

        let fields = [
            {
                name: ':bar_chart:  Totals',
                value: `Messages: ${plugin.nmessages}\nWords: ${plugin.nwords}\nParticipants: ${plugin.nparticipants.length}`
            },
            {
                name: ':writing_hand:  Engagement',
                value: `Messages per user: ${(plugin.nmessages / plugin.nparticipants.length).toFixed(1)}\nWords per message: ${(plugin.nwords / plugin.nmessages).toFixed(1)}`
            },
            {
                name: ':chart_with_upwards_trend:  Activity',
                value: `Messages per day: ${(plugin.nmessages / (Math.floor((Date.now() - plugin.date) / (1000 * 60 * 60 * 24)) + 1)).toFixed(1)}`
            }
        ]

        const embed = new EmbedBuilder()
            .setDescription(`\`\`\`Statistics & Metrics\`\`\`\n`)
            .addFields(...fields)
            .setFooter({ text: `Since ${new Date(plugin.date).toLocaleDateString()}`})
            .setColor(color as ColorResolvable);

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};

export = command;
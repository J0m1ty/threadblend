import { ChatInputCommandInteraction, ColorResolvable, EmbedBuilder, GuildTextBasedChannel, PermissionsBitField, SlashCommandBuilder } from 'discord.js';
import { Command, ExtendedClient, GuildData } from 'src/structures';
import { color } from '../config.json';

const collect = async (channel: GuildTextBasedChannel, limit: number): Promise<string[]> => {
    const total: string[] = [];
    let last: string | undefined = undefined;
    
    do {
        const options = { limit: 100, before: undefined as string | undefined };
        if (last) {
            options.before = last;
        }

        let messages = await channel.messages.fetch(options);
        last = messages.last()?.id;

        total.push(...messages.filter(m => m.content.length > 0 && !m.author.bot).map(m => m.content));

        limit -= messages.size;

        if (messages.size < 100 || limit <= 0) {
            break;
        }
    } while (true);

    console.log(`Collected ${total.length} messages`)

    return total;
};

const command: Command = {
    plugin: null,
    data: new SlashCommandBuilder()
        .setName('plugins')
        .setDescription('Manage channel plugins')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a plugin to the channel')
                .addStringOption(option =>
                    option
                        .setName('available-plugin')
                        .setDescription('The plugin to add')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('List the plugins on the channel'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('enable')
                .setDescription('Enable a plugin on the channel')
                .addStringOption(option =>
                    option
                        .setName('existing-plugin')
                        .setDescription('The plugin to enable')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Disable a plugin on the channel')
                .addStringOption(option =>
                    option
                        .setName('existing-plugin')
                        .setDescription('The plugin to disable')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a plugin from the channel')
                .addStringOption(option =>
                    option
                        .setName('existing-plugin')
                        .setDescription('The plugin to remove')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),
    async autocomplete(focusedOption, interaction) {
        let options: string[] = [];

        switch (focusedOption.name) {
            case 'available-plugin': case 'existing-plugin':
                if (!interaction.inGuild()) break;

                options = ['rules', 'statistics', 'export'];

                let guild: GuildData | null = await (interaction.client as ExtendedClient).db.get(interaction.guildId);

                if (!guild) break;

                let channel = guild.channels[interaction.channelId];

                if (!channel) break;
                
                options = options.filter(p => channel.plugins.some(c => c.name === p) === (focusedOption.name === 'existing-plugin'));

                break;
        }

        return options;
    },
    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.inGuild() || !interaction.channel) return;

        let guild: GuildData | null = await (interaction.client as ExtendedClient).db.get(interaction.guildId);

        if (!guild) return;

        let channel = guild.channels[interaction.channelId];

        if (!channel) return;

        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'add':
                let plugin = interaction.options.getString('available-plugin', true);
                
                if (channel.plugins.some(p => p.name === plugin)) {
                    await interaction.reply({ content: `:x:  That plugin is already exists on this channel.`, ephemeral: true });
                    return;
                }

                switch (plugin) {
                    case 'rules':
                        channel.plugins.push({
                            name: 'rules',
                            readable: 'Formatting Enforcement Module',
                            emoji: ':scroll:',
                            enabled: true,
                            rules: [],
                            date: Date.now()
                        });
                        break;
                    case 'statistics':
                        channel.plugins.push({
                            name: 'statistics',
                            readable: 'Statistics & Metrics Module',
                            emoji: ':bar_chart:',
                            enabled: true,
                            nmessages: 0,
                            nwords: 0,
                            nparticipants: [],
                            date: Date.now()
                        });
                        break;
                    case 'export':
                        let numExportChannels = Object.values(guild.channels).filter(c => c.plugins.some(p => p.name === 'export')).length;

                        if (numExportChannels >= 2) {
                            await interaction.reply({ content: `:x:  Only two channels per server may have the \`${plugin}\` plugin mounted at a time.`, ephemeral: true });
                            return;
                        }

                        channel.plugins.push({
                            name: 'export',
                            readable: 'Message Export Module',
                            emoji: ':outbox_tray:',
                            enabled: true,
                            dirty: true,
                            messages: [],
                            maxMessageLength: 2000,
                            date: Date.now()
                        });
                        break;
                }

                await (interaction.client as ExtendedClient).db.set(interaction.guildId, guild);

                const loadingText = plugin === 'export' ? '\n\n:hourglass_flowing_sand: This plugin may take some time to load.' : '';

                await interaction.reply({ content: `:arrow_forward:  The \`${plugin}\` plugin has been mounted on this channel.${loadingText}`, ephemeral: true });

                if (plugin === 'export') {
                    collect(interaction.channel, Infinity)
                        .then(async (messages) => {
                            let defered_guild: GuildData | null = await (interaction.client as ExtendedClient).db.get(interaction.guildId);

                            if (!defered_guild) return;

                            let defered_channel = defered_guild.channels[interaction.channelId];

                            if (!defered_channel) return;

                            let defered_plugin = defered_channel.plugins.find(p => p.name === 'export');

                            if (!defered_plugin || defered_plugin.name !== 'export') return;
                            
                            defered_plugin.messages = [...messages, ...defered_plugin.messages];

                            defered_plugin.dirty = false;

                            await (interaction.client as ExtendedClient).db.set(interaction.guildId, defered_guild);

                            interaction.followUp({ content: `:white_check_mark:  The \`${plugin}\` plugin has finished loading.`, ephemeral: true });
                        });
                }
                break;
            case 'view':
                if (channel.plugins.length === 0) {
                    await interaction.reply({ content: `:information_source:  No plugins are mounted on this channel.`, ephemeral: true });
                    return;
                }

                let fields: {name: string, value: string}[] = [];

                channel.plugins.forEach((p, i) => {
                    fields.push({
                        name: `${p.emoji}  ${p.readable}`,
                        value: `Status: \`${p.enabled ? 'On 🗸' : 'Off ✗'}\`\nSince: ${new Date(p.date).toLocaleDateString()}\n\u200b`
                    });
                });

                fields[0].name = `\u200b\n${fields[0].name}`;

                const embed = new EmbedBuilder()
                    .setDescription(`\`\`\`Channel Plugins\`\`\``)
                    .setFields(...fields)
                    .setFooter({ text: `Use /plugins {enable|disable} to toggle modules` })
                    .setColor(color as ColorResolvable);

                await interaction.reply({ embeds: [embed], ephemeral: true });

                break;
            case 'enable': case 'disable':
                let pluginNameEnable = interaction.options.getString('existing-plugin', true);

                if (!channel.plugins.some(p => p.name === pluginNameEnable)) {
                    await interaction.reply({ content: `:x:  No such plugin is mounted on this channel.`, ephemeral: true });
                    return;
                }

                channel.plugins.find(p => p.name === pluginNameEnable)!.enabled = subcommand === 'enable';

                await (interaction.client as ExtendedClient).db.set(interaction.guildId, guild);

                await interaction.reply({ content: `:white_check_mark:  The \`${pluginNameEnable}\` plugin has been ${subcommand}d on this channel.`, ephemeral: true });

                break;
            case 'remove':
                let pluginName = interaction.options.getString('existing-plugin', true);

                if (!channel.plugins.some(p => p.name === pluginName)) {
                    await interaction.reply({ content: `:x:  No such plugin is mounted on this channel.`, ephemeral: true });
                    return;
                }
                
                channel.plugins = channel.plugins.filter(p => p.name !== pluginName);

                await (interaction.client as ExtendedClient).db.set(interaction.guildId, guild);

                await interaction.reply({ content: `:arrow_backward:  The \`${pluginName}\` plugin has been unmounted from this channel.`, ephemeral: true });

                break;
        }
    },
};

export = command;
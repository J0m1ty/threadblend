import { AutocompleteFocusedOption, AutocompleteInteraction, ChatInputCommandInteraction, Client, Collection, Message, SlashCommandBuilder, TextChannel } from "discord.js";
import { QuickDB } from "quick.db";

export interface Command {
    plugin: PluginName | null;
    data: SlashCommandBuilder;
    autocomplete?: (focusedOption: AutocompleteFocusedOption, interaction: AutocompleteInteraction) => Promise<string[]>;
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export class ExtendedClient extends Client {
    commands!: Collection<string, Command>;
    db!: QuickDB;
}

export type Rule = {
    name: string;
    builtin: boolean;
}

export type Plugin = {
    name: string;
    readable: string;
    emoji: `:${string}:`;
    enabled: boolean;
    date: number;
}

export type ChannelRules = Plugin & {
    name: 'rules';
    readable: 'Formatting Enforcement Module';
    emoji: ':scroll:';
    rules: Rule[];
}

export type ChannelStatistics = Plugin & {
    name: 'statistics';
    readable: 'Statistics & Metrics Module';
    emoji: ':bar_chart:';
    nmessages: number;
    nwords: number;
    nparticipants: string[];
}

export type ChannelExport = Plugin & {
    name: 'export';
    readable: 'Message Export Module';
    emoji: ':outbox_tray:';
    dirty: boolean;
    messages: string[];
    maxMessageLength: number;
}

export type ChannelPlugin = ChannelRules | ChannelStatistics | ChannelExport;

export type PluginName = ChannelPlugin['name'];

export type ChannelData = {
    plugins: ChannelPlugin[];
}

export type GuildData = {
    channels: { [id: string]: ChannelData };
}

export type Alarm = {
    message: string;
    started: number;
    date: number;
}

export type UserData = {
    alarms: Alarm[];
    joined: number;
    lastSeen: number;
    nmessages: number;
}

export type Users = {
    users: { [id: string]: UserData };
}
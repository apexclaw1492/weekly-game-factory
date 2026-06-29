import type Phaser from 'phaser';
import { AsteroidsScene } from '../scenes/AsteroidsScene';
import { ContraScene } from '../scenes/ContraScene';
import { CosmicCargoScene } from '../scenes/CosmicCargoScene';
import { SpaceInvadersScene } from '../scenes/SpaceInvadersScene';
import { PongScene } from '../scenes/PongScene';

export interface GameDefinition {
  id: string;
  title: string;
  weekLabel: string;
  weekNumber?: number;
  isBonus?: boolean;
  certificationStatus: 'certified' | 'in-rebuild';
  certificationLabel?: string;
  icon: string;
  sceneKey?: string;
  sceneClass?: new () => Phaser.Scene;
  color: number;
  description: string;
  url?: string;
}

export const GAME_BACKLOG_IDEA_COUNT = 88;

export const GAME_DEFINITIONS: readonly GameDefinition[] = [
  {
    id: 'f1-space-invaders',
    title: 'F1 Space Invaders',
    weekLabel: 'Week 0',
    weekNumber: 0,
    certificationStatus: 'certified',
    certificationLabel: 'CERTIFIED TOUCH',
    icon: '🏎️',
    sceneKey: 'SpaceInvadersScene',
    sceneClass: SpaceInvadersScene,
    color: 0x0600EF,
    description: 'Red Bull space invaders! Dodge, blast, build combos.'
  },
  {
    id: 'cosmic-cargo',
    title: 'Cosmic Cargo',
    weekLabel: 'Week 1',
    weekNumber: 1,
    certificationStatus: 'certified',
    certificationLabel: 'CERTIFIED TOUCH',
    icon: '🚀',
    sceneKey: 'CosmicCargoScene',
    sceneClass: CosmicCargoScene,
    color: 0xff6b35,
    description: 'Gravity-switching puzzle. Collect pods and escape.'
  },
  {
    id: 'contra-bonus',
    title: 'Contra Bonus',
    weekLabel: 'Bonus',
    isBonus: true,
    certificationStatus: 'certified',
    certificationLabel: 'CERTIFIED TOUCH',
    icon: '⚔️',
    sceneKey: 'ContraScene',
    sceneClass: ContraScene,
    color: 0xee2222,
    description: 'Run & gun retro action! Jump, shoot, defeat the boss.'
  },
  {
    id: 'asteroid-belt',
    title: 'Asteroid Belt',
    weekLabel: 'Week 2',
    weekNumber: 2,
    certificationStatus: 'certified',
    certificationLabel: 'CERTIFIED TOUCH',
    icon: '☄️',
    sceneKey: 'AsteroidsScene',
    sceneClass: AsteroidsScene,
    color: 0x8899aa,
    description: 'Asteroids shooter clone. Split space rocks and survive.'
  },
  {
    id: 'red-bull-pong',
    title: 'Red Bull Pong',
    weekLabel: 'Week 3',
    weekNumber: 3,
    certificationStatus: 'certified',
    certificationLabel: 'CERTIFIED TOUCH',
    icon: '🏓',
    sceneKey: 'PongScene',
    sceneClass: PongScene,
    color: 0xEE0000,
    description: 'F1-inspired high-speed Pong! Beat the AI and win the set.'
  },
  {
    id: 'rise-of-the-elf-ruler',
    title: 'Rise of the Elf-Ruler',
    icon: '🧝‍♀️',
    weekLabel: 'Week 4',
    weekNumber: 4,
    url: './games/rise-of-the-elf-ruler/index.html',
    color: 0x2e5c1e,
    description: 'Immersive pop-up book elven village builder inspired by Aubrey\'s sketches.',
    certificationStatus: 'certified',
    certificationLabel: 'CERTIFIED TOUCH'
  },
  {
    id: 'aubreys-realm',
    title: "Aubrey's Realm",
    icon: '🧝‍♀️',
    weekLabel: 'Week 5',
    weekNumber: 5,
    url: './games/aubreys-realm/index.html',
    color: 0xd4a843,
    description: 'Explore a magical realm. Collect star-seeds to awaken the sleeping world.',
    certificationStatus: 'certified',
    certificationLabel: 'CERTIFIED TOUCH'
  },
  {
    id: '2048',
    title: '2048',
    icon: '🔢',
    weekLabel: 'Curated',
    url: './games/2048/index.html',
    color: 0x7766aa,
    description: 'Merge tiles to reach 2048.',
    certificationStatus: 'certified',
    certificationLabel: 'LEGACY WEB',
    isBonus: true
  },
  {
    id: 'clumsy-bird',
    title: 'Clumsy Bird',
    icon: '🐦',
    weekLabel: 'Curated',
    url: './games/clumsy-bird/index.html',
    color: 0x44aa77,
    description: 'Tap to fly through the pipes.',
    certificationStatus: 'certified',
    certificationLabel: 'LEGACY WEB',
    isBonus: true
  },
  {
    id: 'hextris',
    title: 'Hextris',
    icon: '🔷',
    weekLabel: 'Curated',
    url: './games/hextris/index.html',
    color: 0xcc44dd,
    description: 'Rotate the hexagon and match colors.',
    certificationStatus: 'certified',
    certificationLabel: 'LEGACY WEB',
    isBonus: true
  },
  {
    id: 'pac-man',
    title: 'Pac-Man',
    icon: '👾',
    weekLabel: 'Curated',
    url: './games/pac-man/index.html',
    color: 0xffdd00,
    description: 'Eat dots, dodge ghosts, and survive.',
    certificationStatus: 'certified',
    certificationLabel: 'LEGACY WEB',
    isBonus: true
  }
];

export const PUBLISHED_WEEK_COUNT = GAME_DEFINITIONS.filter((game) => game.weekNumber !== undefined).length;
export const BONUS_GAME_COUNT = GAME_DEFINITIONS.filter((game) => game.isBonus).length;
export const CERTIFIED_GAME_COUNT = GAME_DEFINITIONS.filter((game) => game.certificationStatus === 'certified').length;

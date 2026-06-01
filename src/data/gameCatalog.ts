import type Phaser from 'phaser';
import { AsteroidsScene } from '../scenes/AsteroidsScene';
import { ContraScene } from '../scenes/ContraScene';
import { CosmicCargoScene } from '../scenes/CosmicCargoScene';
import { SpaceInvadersScene } from '../scenes/SpaceInvadersScene';

export interface GameDefinition {
  id: string;
  title: string;
  weekLabel: string;
  weekNumber?: number;
  isBonus?: boolean;
  icon: string;
  sceneKey: string;
  sceneClass: new () => Phaser.Scene;
  color: number;
  description: string;
}

export const GAME_BACKLOG_IDEA_COUNT = 88;

export const GAME_DEFINITIONS: readonly GameDefinition[] = [
  {
    id: 'f1-space-invaders',
    title: 'F1 Space Invaders',
    weekLabel: 'Week 0',
    weekNumber: 0,
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
    icon: '☄️',
    sceneKey: 'AsteroidsScene',
    sceneClass: AsteroidsScene,
    color: 0x8899aa,
    description: 'Asteroids shooter clone. Split space rocks and survive.'
  }
];

export const PUBLISHED_WEEK_COUNT = GAME_DEFINITIONS.filter((game) => game.weekNumber !== undefined).length;
export const BONUS_GAME_COUNT = GAME_DEFINITIONS.filter((game) => game.isBonus).length;

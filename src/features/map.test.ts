import { expect, it } from 'vitest'
import { INITIAL_MAP_VIEW, MAP_ANCHORS, MAP_HEIGHT, MAP_TILES, MAP_WIDTH, mapPosition, mapTiles, zoomView } from './map'
it('keeps every illustrative group within the Manta map viewport', () => {
  for (const anchor of MAP_ANCHORS) {
    const { x, y } = mapPosition(anchor.lat, anchor.lon)
    expect(x).toBeGreaterThan(60); expect(x).toBeLessThan(MAP_WIDTH - 60)
    expect(y).toBeGreaterThan(60); expect(y).toBeLessThan(MAP_HEIGHT - 60)
  }
  expect(mapPosition(-.973, -80.722)).toEqual({ x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 })
  expect(MAP_TILES.length).toBeLessThanOrEqual(20)
  expect(MAP_TILES.every(tile => tile.url.startsWith('https://tile.openstreetmap.org/13/'))).toBe(true)
})
it('keeps geographic overlays aligned with the tile grid across zoom and pan', () => {
  for (const zoom of [12, 13, 14, 15, 16]) {
    const view = { zoom, panX: 81, panY: -63 }
    expect(mapPosition(-.973, -80.722, view)).toEqual({ x: MAP_WIDTH / 2 - 81, y: MAP_HEIGHT / 2 + 63 })
    const tiles = mapTiles(view)
    expect(tiles.length).toBeLessThanOrEqual(20)
    expect(Math.min(...tiles.map(tile => tile.x))).toBeLessThanOrEqual(0)
    expect(Math.max(...tiles.map(tile => tile.x + 256))).toBeGreaterThanOrEqual(MAP_WIDTH)
    expect(Math.min(...tiles.map(tile => tile.y))).toBeLessThanOrEqual(0)
    expect(Math.max(...tiles.map(tile => tile.y + 256))).toBeGreaterThanOrEqual(MAP_HEIGHT)
  }
  const panned = { ...INITIAL_MAP_VIEW, panX: 90, panY: -40 }
  expect(zoomView(zoomView(panned, 1), -1)).toEqual(panned)
  expect(zoomView(INITIAL_MAP_VIEW, 99).zoom).toBe(16)
  expect(zoomView(INITIAL_MAP_VIEW, -99).zoom).toBe(12)
})

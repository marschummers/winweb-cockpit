import { OPEN_DEAL_PHASES, type Deal } from '../db/types'

export function openDeals(deals: Deal[]): Deal[] {
  return deals.filter((d) => (OPEN_DEAL_PHASES as string[]).includes(d.phase))
}

export function unweightedPipeline(deals: Deal[]): number {
  return openDeals(deals).reduce((sum, d) => sum + d.volume, 0)
}

export function weightedPipeline(deals: Deal[]): number {
  return openDeals(deals).reduce((sum, d) => sum + (d.volume * d.probability) / 100, 0)
}

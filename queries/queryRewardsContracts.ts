import { getRewardsInfo } from '../services/rewards'
import { convertMicroDenomToDenom } from '../util/conversion'
import { InternalQueryContext } from './types'
import { PoolEntityType } from './usePoolsListQuery'

const blocksPerSecond = 6
const blocksPerYear = (525600 * 60) / blocksPerSecond

export type QueryRewardsContractsArgs = {
  swapAddress: PoolEntityType['swap_address']
  rewardsTokens: PoolEntityType['rewards_tokens']
  context: InternalQueryContext
}

export async function queryRewardsContracts({
  swapAddress,
  rewardsTokens,
  context: { client, getTokenDollarValue },
}: QueryRewardsContractsArgs) {
  const rewardsContractsInfo = await Promise.all(
    rewardsTokens.map(({ rewards_address }) =>
      getRewardsInfo(rewards_address, client)
    )
  )

  const serializedContractsInfo = await Promise.all(
    rewardsContractsInfo.map(async (contractInfo, index) => {
      const tokenInfo = rewardsTokens[index]

      const rewardRatePerBlockInTokens = convertMicroDenomToDenom(
        contractInfo.reward.reward_rate,
        tokenInfo.decimals
      )

      const rewardRatePerBlockInDollarValue = await getTokenDollarValue({
        tokenInfo,
        tokenAmountInDenom: rewardRatePerBlockInTokens,
      })

      const rewardRate = {
        ratePerBlock: {
          tokenAmount: rewardRatePerBlockInTokens,
          dollarValue: rewardRatePerBlockInDollarValue,
        },
        ratePerYear: {
          tokenAmount: rewardRatePerBlockInTokens * blocksPerYear,
          dollarValue: rewardRatePerBlockInDollarValue * blocksPerYear,
        },
      }

      return {
        contract: contractInfo,
        rewardRate,
        tokenInfo,
      }
    })
  )

  return {
    contracts: serializedContractsInfo,
    swap_address: swapAddress,
  }
}

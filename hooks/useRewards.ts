import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate'
import { useQuery } from 'react-query'
import { useRecoilValue } from 'recoil'
import { getPendingRewards, getRewardsInfo } from 'services/rewards'
import { walletState, WalletStatusType } from 'state/atoms/walletAtoms'
import { DEFAULT_TOKEN_BALANCE_REFETCH_INTERVAL } from 'util/constants'
import { convertMicroDenomToDenom } from 'util/conversion'
import { useChainInfo } from './useChainInfo'
import { useRewardContractsList } from './useRewardContractsList'
import { useMemo } from 'react'

const useSelectRewardsContractBySwapAddress = ({ swapAddress }) => {
  const [rewardsContracts] = useRewardContractsList()

  return useMemo(
    () =>
      rewardsContracts?.find(
        ({ swap_address }) => swap_address === swapAddress
      ),
    [swapAddress, rewardsContracts]
  )
}

export const usePendingRewardsBalance = ({ swapAddress }) => {
  const { address, status, client } = useRecoilValue(walletState)

  const rewardsContract = useSelectRewardsContractBySwapAddress({ swapAddress })

  const { data: rewards = 0, isLoading } = useQuery(
    [`pendingRewards/${swapAddress}`, address],
    async () => {
      const pendingRewards = await Promise.all(
        rewardsContract.rewards_tokens.map(
          async ({ rewards_address, decimals }) => {
            const { pending_rewards, ...rest } = await getPendingRewards(
              address,
              rewards_address,
              client
            )

            console.log('getPendingRewards', {
              pending_rewards,
              ...rest,
            })

            return convertMicroDenomToDenom(Number(pending_rewards), decimals)
          }
        )
      )

      return pendingRewards.reduce(
        (amount, pending_rewards) => amount + pending_rewards,
        0
      )
    },
    {
      enabled: Boolean(
        rewardsContract && swapAddress && status === WalletStatusType.connected
      ),
      refetchOnMount: 'always',
      refetchInterval: DEFAULT_TOKEN_BALANCE_REFETCH_INTERVAL,
      refetchIntervalInBackground: true,
    }
  )

  return [rewards, isLoading]
}

export const useRewardsInfo = ({ swapAddress }) => {
  const [chainInfo] = useChainInfo()
  const rewardsContract = useSelectRewardsContractBySwapAddress({ swapAddress })

  const { data: info = [], isLoading } = useQuery(
    `rewardsInfo/${rewardsContract}`,
    async () => {
      const client = await CosmWasmClient.connect(chainInfo.rpc)
      return Promise.all(
        rewardsContract.rewards_tokens.map(({ rewards_address }) =>
          getRewardsInfo(rewards_address, client)
        )
      )
    },
    {
      enabled: Boolean(rewardsContract && chainInfo?.rpc),
      refetchOnMount: false,
      refetchIntervalInBackground: false,
    }
  )

  return [info, isLoading]
}

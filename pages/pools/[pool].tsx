import { AppLayout, NavigationSidebar } from 'components'
import {
  BondLiquidityDialog,
  LiquidityBreakdown,
  LiquidityHeader,
  LiquidityRewardsCard,
  ManageBondedLiquidityCard,
  ManageLiquidityCard,
  ManagePoolDialog,
  UnbondingLiquidityStatusList,
} from 'features/liquidity'
import { useRefetchQueries } from 'hooks/useRefetchQueries'
import {
  useClaimRewards,
  usePendingRewards,
  useRewardsInfo,
} from 'hooks/useRewardsQueries'
import {
  Button,
  ChevronIcon,
  Divider,
  Error,
  IconWrapper,
  media,
  Spinner,
  styled,
  Toast,
  UpRightArrow,
  useMedia,
  Valid,
} from 'junoblocks'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import React, { useState } from 'react'
import { toast } from 'react-hot-toast'
import { __POOL_STAKING_ENABLED__, APP_NAME } from 'util/constants'
import { formatSdkErrorMessage } from 'util/formatSdkErrorMessage'

import { usePoolsListQuery } from '../../queries/usePoolsListQuery'
import { useQueryPoolLiquidity } from '../../queries/useQueryPools'

export default function Pool() {
  const {
    query: { pool: poolId },
  } = useRouter()

  const [
    { isShowing: isManageLiquidityDialogShowing, actionType },
    setManageLiquidityDialogState,
  ] = useState({ isShowing: false, actionType: 'add' as 'add' | 'remove' })

  const [isBondingDialogShowing, setIsBondingDialogShowing] = useState(false)

  const isMobile = useMedia('sm')
  const { data: poolsList } = usePoolsListQuery()
  const pool = poolId && poolsList?.poolsById[poolId as string]

  const [
    {
      totalLiquidity,
      fluid,
      reserve,
      staked,
      tokenDollarValue,
      myStakedLiquidity,
      rewards,
    } = {} as any,
    isLoading,
  ] = useQueryPoolLiquidity({ poolId })

  const [rewardsContracts] = useRewardsInfo({
    swapAddress: pool?.swap_address,
  })

  const [pendingRewards] = usePendingRewards({
    swapAddress: pool?.swap_address,
  })

  const isLoadingInitial = isLoading && !totalLiquidity

  const supportsIncentives = Boolean(
    __POOL_STAKING_ENABLED__ && pool?.staking_address
  )

  const refetchQueries = useRefetchQueries([
    'myLiquidity',
    'stakedTokenBalance',
    'pendingRewards',
  ])

  const { mutate: mutateClaimRewards, isLoading: isClaimingRewards } =
    useClaimRewards({
      swapAddress: pool?.swap_address,
      onSuccess() {
        refetchQueries()

        toast.custom((t) => (
          <Toast
            icon={<IconWrapper icon={<Valid />} color="valid" />}
            title="Rewards were successfully claimed!"
            onClose={() => toast.dismiss(t.id)}
          />
        ))
      },
      onError(e) {
        console.error(e)

        toast.custom((t) => (
          <Toast
            icon={<IconWrapper icon={<Error />} color="error" />}
            title={"Couldn't claim your rewards"}
            body={formatSdkErrorMessage(e)}
            buttons={
              <Button
                as="a"
                variant="ghost"
                href={process.env.NEXT_PUBLIC_FEEDBACK_LINK}
                target="__blank"
                iconRight={<UpRightArrow />}
              >
                Provide feedback
              </Button>
            }
            onClose={() => toast.dismiss(t.id)}
          />
        ))
      },
    })

  if (!pool || !poolId) return null

  return (
    <>
      <ManagePoolDialog
        isShowing={isManageLiquidityDialogShowing}
        initialActionType={actionType}
        onRequestClose={() =>
          setManageLiquidityDialogState({
            isShowing: false,
            actionType: 'add',
          })
        }
        poolId={poolId}
      />

      {__POOL_STAKING_ENABLED__ && (
        <BondLiquidityDialog
          isShowing={isBondingDialogShowing}
          onRequestClose={() => setIsBondingDialogShowing(false)}
          poolId={pool}
        />
      )}

      {pool && (
        <Head>
          <title>
            {APP_NAME} — Pool {tokenB.pool_id}
          </title>
        </Head>
      )}

      <AppLayout
        navigationSidebar={
          <NavigationSidebar
            shouldRenderBackButton={isMobile}
            backButton={
              <Link href="/pools" passHref>
                <Button as="a" variant="ghost" icon={<ChevronIcon />} />
              </Link>
            }
          />
        }
      >
        <LiquidityHeader
          tokenA={tokenA}
          tokenB={tokenB}
          size={isMobile ? 'small' : 'large'}
        />

        {!isMobile && <Divider />}

        {isLoadingInitial && (
          <StyledDivForSpinner>
            <Spinner color="primary" size={32} />
          </StyledDivForSpinner>
        )}

        {!isLoadingInitial && (
          <>
            <LiquidityBreakdown
              poolId={pool}
              tokenA={tokenA}
              tokenB={tokenB}
              totalLiquidity={totalLiquidity}
              rewardsInfo={rewardsInfo}
              rewardsContracts={rewardsContracts}
              size={isMobile ? 'small' : 'large'}
            />
            <>
              <StyledDivForCards>
                <ManageLiquidityCard
                  myLiquidityReserve={myLiquidityReserve}
                  tokenDollarValue={tokenDollarValue}
                  tokenASymbol={tokenA.symbol}
                  tokenBSymbol={tokenB.symbol}
                  myStakedLiquidity={myStakedLiquidity}
                  myStakedLiquidityReserve={myStakedLiquidityReserve}
                  supportsIncentives={supportsIncentives}
                  onClick={() =>
                    setManageLiquidityDialogState({
                      isShowing: true,
                      actionType: 'add',
                    })
                  }
                />
                <ManageBondedLiquidityCard
                  onClick={() => setIsBondingDialogShowing(true)}
                  myLiquidity={myLiquidity}
                  stakedBalance={myStakedLiquidity}
                  rewardsInfo={rewardsInfo}
                  supportsIncentives={supportsIncentives}
                />
                <LiquidityRewardsCard
                  onClick={mutateClaimRewards}
                  hasBondedLiquidity={myStakedLiquidity?.tokenAmount > 0}
                  hasProvidedLiquidity={myLiquidity?.tokenAmount > 0}
                  pendingRewards={pendingRewards}
                  loading={isClaimingRewards}
                  supportsIncentives={supportsIncentives}
                />
              </StyledDivForCards>
            </>
            <>
              {supportsIncentives && (
                <UnbondingLiquidityStatusList
                  poolId={pool as string}
                  tokenA={tokenA}
                  tokenB={tokenB}
                  size={isMobile ? 'small' : 'large'}
                />
              )}
            </>
          </>
        )}
      </AppLayout>
    </>
  )
}

const StyledDivForCards = styled('div', {
  display: 'grid',
  columnGap: '$8',
  gridTemplateColumns: '1fr 1fr 1fr',
  [media.sm]: {
    gridTemplateColumns: '1fr',
    rowGap: '$8',
  },
})

const StyledDivForSpinner = styled('div', {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  paddingTop: 143,
})

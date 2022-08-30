import { useTokenInfo } from 'hooks/useTokenInfo'
import {
  Button,
  ErrorIcon,
  formatSdkErrorMessage,
  IconWrapper,
  Toast,
  UpRightArrow,
  Valid,
} from 'junoblocks'
import { toast } from 'react-hot-toast'
import { useMutation } from 'react-query'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import { directTokenSwap, passThroughTokenSwap } from 'services/swap'
import {
  TransactionStatus,
  transactionStatusState,
} from 'state/atoms/transactionAtoms'
import { walletState, WalletStatusType } from 'state/atoms/walletAtoms'
import { convertDenomToMicroDenom } from 'util/conversion'

import { useRefetchQueries } from '../../../hooks/useRefetchQueries'
import { formatCompactNumber } from '../../../util/formatCompactNumber'
import { slippageAtom, tokenSwapAtom } from '../swapAtoms'
import { useTokenToTokenPrice } from './useTokenToTokenPrice'

type UseTokenSwapArgs = {
  tokenASymbol: string
  tokenBSymbol: string
  /* token amount in denom */
  tokenAmount: number
}

export const useTokenSwap = ({
  tokenASymbol,
  tokenBSymbol,
  tokenAmount: providedTokenAmount,
}: UseTokenSwapArgs) => {
  const { client, address, status } = useRecoilValue(walletState)
  const setTransactionState = useSetRecoilState(transactionStatusState)
  const slippage = useRecoilValue(slippageAtom)
  const setTokenSwap = useSetRecoilState(tokenSwapAtom)

  const tokenA = useTokenInfo(tokenASymbol)
  const tokenB = useTokenInfo(tokenBSymbol)
  const refetchQueries = useRefetchQueries(['tokenBalance'])

  const [tokenToTokenPrice] = useTokenToTokenPrice({
    tokenASymbol,
    tokenBSymbol,
    tokenAmount: providedTokenAmount,
  })

  return useMutation(
    'swapTokens',
    async () => {
      if (status !== WalletStatusType.connected) {
        throw new Error('Please connect your wallet.')
      }

      setTransactionState(TransactionStatus.EXECUTING)

      const tokenAmount = convertDenomToMicroDenom(
        providedTokenAmount,
        tokenA.decimals
      )

      const price = convertDenomToMicroDenom(
        tokenToTokenPrice.price,
        tokenB.decimals
      )

      const { poolsForTokenSwap } = tokenToTokenPrice
      const isDirectPoolPoolForSwap = poolsForTokenSwap.length === 1
      if (isDirectPoolPoolForSwap) {
        const [pool] = poolsForTokenSwap

        const isTokenAToTokenBPool =
          pool.pool_assets[0].symbol === tokenA.symbol

        const swapDirection = isTokenAToTokenBPool
          ? 'tokenAtoTokenB'
          : 'tokenBtoTokenA'

        return await directTokenSwap({
          tokenAmount,
          price,
          slippage,
          senderAddress: address,
          swapAddress: pool?.swap_address,
          swapDirection,
          tokenA,
          client,
        })
      }

      // Smoke test
      if (!poolsForTokenSwap?.length) {
        throw new Error(
          'Was not able to identify swap route for this token pair. Please contact the engineering team.'
        )
      }

      const [inputPool, outputPool] = poolsForTokenSwap
      return await passThroughTokenSwap({
        tokenAmount,
        price,
        slippage,
        senderAddress: address,
        tokenA,
        swapAddress: inputPool.swap_address,
        outputSwapAddress: outputPool.swap_address,
        client,
      })
    },
    {
      onSuccess() {
        toast.custom((t) => (
          <Toast
            icon={<IconWrapper icon={<Valid />} color="primary" />}
            title="Swap successful"
            body={`Turned ${formatCompactNumber(
              providedTokenAmount,
              'tokenAmount'
            )} ${tokenA.symbol} to ${formatCompactNumber(
              tokenToTokenPrice.price,
              'tokenAmount'
            )} ${tokenB.symbol}`}
            onClose={() => toast.dismiss(t.id)}
          />
        ))

        setTokenSwap(([tokenA, tokenB]) => [
          {
            ...tokenA,
            amount: 0,
          },
          tokenB,
        ])

        refetchQueries()
      },
      onError(e) {
        const errorMessage = formatSdkErrorMessage(e)

        toast.custom((t) => (
          <Toast
            icon={<ErrorIcon color="error" />}
            title="Oops swap error!"
            body={errorMessage}
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
      onSettled() {
        setTransactionState(TransactionStatus.IDLE)
      },
    }
  )
}

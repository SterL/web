import { useToast } from '@chakra-ui/react'
import { ChainIdentifier } from '@shapeshiftoss/chain-adapters'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { AnimatePresence } from 'framer-motion'
import { bnOrZero } from 'lib/bignumber'
import React from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import {
  Redirect,
  Route,
  RouteComponentProps,
  Switch,
  useHistory,
  useLocation
} from 'react-router-dom'

import { SelectAssets } from '../../SelectAssets/SelectAssets'
import { QrCodeScanner } from './QrCodeScanner/QrCodeScanner'
import { SendRoutes } from './Send'
import { Address } from './views/Address'
import { Confirm } from './views/Confirm'
import { Details } from './views/Details'

// @TODO Determine if we should use symbol for display purposes or some other identifier for display
type SendInput = {
  address: string
  asset: any
  fee: string
  crypto: {
    amount: string
    symbol: string
  }
  fiat: {
    amount: string
    symbol: string
  }
  transaction: unknown
}

export const Form = ({ asset }) => {
  const location = useLocation()
  const history = useHistory()
  const toast = useToast()
  const { send } = useModal()
  const chainAdapter = useChainAdapters()
  const {
    state: { wallet }
  } = useWallet()

  const methods = useForm<SendInput>({
    mode: 'onChange',
    defaultValues: {
      address: '',
      asset,
      fee: 'average',
      crypto: {
        amount: '',
        symbol: asset?.symbol
      },
      fiat: {
        amount: '',
        symbol: 'USD' // TODO: localize currency
      }
    }
  })

  const handleAssetSelect = () => {
    /** @todo wire up asset select */
    // methods.setValue('asset', asset)
    history.push(SendRoutes.Details)
  }

  const handleSend = async (data: SendInput) => {
    if (wallet) {
      try {
        const path = "m/44'/60'/0'/0/0" // TODO get from asset service
        const adapter = chainAdapter.byChain(ChainIdentifier.Ethereum)
        const value = bnOrZero(data.crypto.amount)
          .times(bnOrZero(10).exponentiatedBy(asset.decimals))
          .toString()
        const txToSign = await adapter.buildSendTransaction({
          to: data.address,
          value,
          erc20ContractAddress: data.asset.contractAddress,
          wallet,
          path
        })
        const signedTx = await adapter.signTransaction({ txToSign, wallet })
        await adapter.broadcastTransaction(signedTx)
        send.close()
        toast({
          title: `${data.asset.name} sent`,
          description: `You have successfully sent ${data.crypto.amount} ${data.crypto.symbol}`,
          status: 'success',
          duration: 9000,
          isClosable: true,
          position: 'top-right'
        })
      } catch (error) {
        console.error(error)
      }
    }
  }

  const checkKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter') event.preventDefault()
  }

  return (
    <FormProvider {...methods}>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <form onSubmit={methods.handleSubmit(handleSend)} onKeyDown={checkKeyDown}>
        <AnimatePresence exitBeforeEnter initial={false}>
          <Switch location={location} key={location.key}>
            <Route
              path={SendRoutes.Select}
              component={(props: RouteComponentProps) => (
                <SelectAssets onClick={handleAssetSelect} {...props} />
              )}
            />
            <Route path={SendRoutes.Address} component={Address} />
            <Route path={SendRoutes.Details} component={Details} />
            <Route path={SendRoutes.Scan} component={QrCodeScanner} />
            <Route path={SendRoutes.Confirm} component={Confirm} />
            <Redirect exact from='/' to={SendRoutes.Select} />
          </Switch>
        </AnimatePresence>
      </form>
    </FormProvider>
  )
}

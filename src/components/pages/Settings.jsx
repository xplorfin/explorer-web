import classnames from 'classnames'
import { pipe } from 'ramda'
import React, { useState, useContext, useEffect, useRef } from 'react'
import { toast } from 'react-toastify'

import { PoeVerifiedBadge } from 'Images'

import { Main } from 'components/templates/Main'
import { Email } from 'components/shared/Email'
import { Password } from 'components/shared/Password'
import { PasswordRepeat } from 'components/shared/PasswordRepeat'

import { eventToValue } from 'helpers/eventToValue'

import { useDocumentKeyDownFilter } from 'hooks/useDocumentKeyDown'
import { usePoeBalance } from 'hooks/usePoeBalance'

import { ApiContext } from 'providers/ApiProvider'
import { SessionContext } from 'providers/SessionProvider'

import classNames from './Settings.scss'

export const Settings = () => (
  <Main>
    <section className={classNames.settings}>
      <header>
        <h1>Profile Settings</h1>
      </header>
      <main>
        <ProfileForm />
        <PoeWalletForm/>
        <WalletForm />
        <PasswordForm />
      </main>
    </section>
  </Main>
)

const ProfileForm = () => {
  const { api, isBusy } = useContext(ApiContext)
  const [account, setAccount] = useContext(SessionContext)
  const [name, setName] = useState(account.name || '')
  const [email, setEmail] = useState(account.email || '')
  const [bio, setBio] = useState(account.bio || '')

  const onSubmit = async () => {
    event.preventDefault()

    if (!account.issuer)
      throw new Error('account.issuer not set')

    const newFields = {
      name,
      email,
      bio,
    }
    await api.accountPatch(account.issuer)(newFields)
    setAccount({
      ...account,
      ...newFields,
    })
    toast.success('Profile updated.')
  }

  return (
    <section className={classNames.profile}>
      <h2>Profile</h2>
      <form onSubmit={onSubmit} className={classnames({ isBusy })}>
        <label htmlFor="name">Name</label>
        <input type="text" id="name" value={name} onChange={pipe(eventToValue, setName)} />
        <label htmlFor="email">Email</label>
        <Email value={email} onChange={setEmail} id="email" disabled={true} />
        <label htmlFor="bio">Bio</label>
        <input type="text" id="bio" value={bio} onChange={pipe(eventToValue, setBio)} />
        <button type="submit" disabled={isBusy}>Submit</button>
      </form>
    </section>
  )
}

const PoeWalletForm = () => {
  const [account, setAccount] = useContext(SessionContext)
  const [mewVisible, setMewVisible] = useState(false)
  const poeBalance = usePoeBalance(account?.poeAddress)

  const onLink = () => {
    setMewVisible(true)
  }

  const onUnlink = () => {
    setAccount({
      ...account,
      poeAddress: '',
      poeAddressVerified: '',
    })
  }

  return (
    <section className={classNames.poeWallet}>
      <header>
        <h2>Connect your Wallet</h2>
        <PoeStatus poeAddressVerified={account.poeAddressVerified} poeBalance={poeBalance} />
        { account.poeAddressVerified && <PoeBalance poeBalance={poeBalance} /> }
        { account.poeAddressVerified &&  <PoeVerified/>}
      </header>
      <main>
        <AddressLinkingAction
          address={account?.poeAddress}
          verified={account?.poeAddressVerified}
          onLink={onLink}
          onUnlink={onUnlink}
        />
        { mewVisible && <PoeWalletMewOverlay issuer={account.issuer} onDone={() => setMewVisible(false)}/> }
      </main>
    </section>
  )
}

const PoeStatus = ({ poeAddressVerified, poeBalance }) =>
  !poeAddressVerified
  ? <h3>Connect your Ethereum wallet with at least 1000 POE to gain access to exclusive features, like uploading images, videos, and audio files.</h3>
  : poeBalance >= 1000
  ? <h3>Your wallet is verified and has a sufficient POE balance for exclusive features.</h3>
  : <h3>Your wallet needs at least 1000 POE to access exclusive features. Click <a href="https://www.binance.com/en" target="_blank">here</a> to find out where to buy POE.</h3>

const PoeVerified = () => (
  <section className={classNames.poeVerified}>
    <header>
      Verified:
    </header>
    <main>
      <img src={PoeVerifiedBadge} />
      <span>Verified</span>
    </main>
  </section>
)

const PoeBalance = ({ poeBalance }) => (
  <section className={classnames(classNames.poeBalance, { [classNames.enough]: poeBalance >= 1000 })}>
    <header>Balance: </header>
    <main>{poeBalance} POE</main>
  </section>
)

const AddressLinkingAction = ({ address, verified, onLink, onUnlink }) =>
  !verified
    ? <LinkAddress onLink={onLink}/>
    : <UnlinkAddress onUnlink={onUnlink} address={address} />

const LinkAddress = ({ onLink }) => (
  <section className={classNames.linkAddress}>
    <button onClick={onLink}>Connect with MyEtherWallet</button>
  </section>
)

const UnlinkAddress = ({ onUnlink, address }) => (
  <section className={classNames.unlinkAddress}>
    <label>ETH Address</label>
    <input type="text" value={address} readOnly />
    <button onClick={onUnlink}>Unlink Address</button>
  </section>
)

const PoeWalletMewOverlay = ({ onDone }) => {
  const { api } = useContext(ApiContext)
  const [account, setAccount] = useContext(SessionContext)
  const [poeAddressMessage, setPoeAddressMessage] = useState('')
  const [signedMessage, setSignedMessage] = useState('')
  const [poeAddress, setPoeAddress] = useState('')
  const [poeSignature, setPoeSignature] = useState('')

  useEffect(() => {
    if (api && account && !account.poeAddressVerified)
      api.accountPoeChallengePost(account.issuer)()
        .then(_ => _.poeAddressMessage)
        .then(setPoeAddressMessage)
  }, [api, account])

  const onOverlayClick = (event) => {
    if (event.target === event.currentTarget)
      onDone()
  }

  useDocumentKeyDownFilter('Escape', onDone)

  useEffect(() => {
    try {
      const { address, sig } = JSON.parse(signedMessage)
      setPoeAddress(address || '')
      setPoeSignature(sig || '')
    } catch {
      setPoeAddress('')
      setPoeSignature('')
    }
  }, [signedMessage])

  useEffect(() => {
    console.log('poeAddress, poeSignature', poeAddress, poeSignature)
  }, [poeAddress, poeSignature])

  const onSubmit = async (event) => {
    event.preventDefault()

    const patchedAccount = await api.accountPatch(account.issuer)({ poeAddress, poeSignature })
    setAccount({
      ...account,
      ...patchedAccount,
    })

    if (patchedAccount.poeAddressVerified)
      toast.success('POE Wallet updated.')
    else
      toast.error('POE address could not be verified.')

    onDone()
  }

  return (
    <section className={classNames.poeWalletMewOverlay} onClick={onOverlayClick}>
      <section>
        <header>
          <h1>Connect your POE Wallet</h1>
          <h2>Read <a href="https://docs.poetnetwork.net/" target="_blank">this guide</a> for a full tutorial on how to connect your Ethereum address on MEW</h2>
        </header>
        <main>
          <form onSubmit={onSubmit}>
            <label htmlFor="poeAddressMessage">Message (<a target="_blank" href="https://www.myetherwallet.com/interface/sign-message">copy and paste into MEW</a>)</label>
            <CopyInput className={classNames.poeAddressMessage} id="poeAddressMessage" value={poeAddressMessage} />
            <label>Signed Message</label>
            <textarea value={signedMessage} onChange={pipe(eventToValue, setSignedMessage)} required />
            <button type="submit">Connect Your Wallet</button>
          </form>
        </main>
      </section>
    </section>
  )
}

const CopyInput = ({ className, id, value }) => {
  const copy = useRef()

  const onCopy = (event) => {
    event.preventDefault()
    copy.current?.select()
    document.execCommand('copy')
  }

  return (
    <section className={className}>
      <input type="text" ref={copy} id={id} value={value} readOnly />
      <button onClick={onCopy}>Copy</button>
    </section>
  )
}

const WalletForm = () => {
  const { api, isBusy } = useContext(ApiContext)
  const [account, setAccount] = useContext(SessionContext)
  const [ethereumAddress, setEthereumAddress] = useState(account.ethereumAddress || '')

  const onSubmit = async () => {
    event.preventDefault()

    if (!account.issuer)
      throw new Error('account.issuer not set')

    await api.accountPatch(account.issuer)({ ethereumAddress })
    setAccount({
      ...account,
      ethereumAddress,
    })
    toast.success('Wallet updated.')
  }

  return (
    <section className={classNames.wallet}>
      <h2>Wallet</h2>
      <form onSubmit={onSubmit} className={classnames({ isBusy })}>
        <label htmlFor="eth">ETH Address</label>
        <input type="text" id="eth" value={ethereumAddress} onChange={pipe(eventToValue, setEthereumAddress)} />
        <button type="submit" disabled={isBusy}>Save</button>
      </form>
    </section>
  )
}

const PasswordForm = () => {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const { api, isBusy } = useContext(ApiContext)

  const onSubmit = () => {
    event.preventDefault();
    api.passwordChangeWithOld({ password: newPassword, oldPassword: currentPassword })
      .then(result => result && toast.success('Your password has been updated!'))
  }

  return (
    <section className={classNames.password}>
      <h2>Password</h2>
      <form onSubmit={onSubmit} className={classnames({ isBusy })}>
        <label htmlFor="currentPassword">Current Password</label>
        <Password value={currentPassword} onChange={setCurrentPassword} id="currentPassword"/>
        <label htmlFor="newPassword">New Password</label>
        <Password password={newPassword} onChange={setNewPassword} id="newPassword"/>
        <label htmlFor="passwordRepeat">Confirm New Password</label>
        <PasswordRepeat password={newPassword} id="passwordRepeat"/>
        <button type="submit" disabled={isBusy}>Update Password</button>
      </form>
    </section>
  )
}

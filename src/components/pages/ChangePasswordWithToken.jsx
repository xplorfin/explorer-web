import React, { useContext, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

import { Logo } from 'Images'

import { Password } from 'components/shared/Password'
import { PasswordRepeat } from 'components/shared/PasswordRepeat'
import { ApiContext } from 'providers/ApiProvider'

import classNames from './ChangePasswordWithToken.scss'

export const ChangePasswordWithToken = ({ token }) => {
  const { api } = useContext(ApiContext)
  const [isDone, setIsDone] = useState(false)
  const [password, setPassword] = useState(null)

  useEffect(() => {
    if (password)
      api.passwordChangeWithToken(token, password).then(token => setIsDone(token !== undefined))
  }, [password])

  return !isDone
    ? <Input onSubmit={setPassword} />
    : <Done />
}

const Input = ({ onSubmit }) => {
  const [password, setPassword] = useState('')

  const onSubmitWrapper = event => {
    event.preventDefault()
    onSubmit(password)
  }

  return (
    <Template>
      <h2>Please enter the new password to your account:</h2>
      <form onSubmit={onSubmitWrapper}>
        <Password
          placeholder="New Password"
          value={password}
          onChange={setPassword}
        />
        <PasswordRepeat password={password} />
        <nav>
          <button type="submit">Change Password</button>
          <nav>
            <Link to="/login">Go to login</Link>
          </nav>
        </nav>
      </form>
    </Template>
  )
}

export const Done = () => (
  <Template>
    <h2>All done! You can now login with your new password.</h2>
    <Link to="/login">Go to login</Link>
  </Template>
)

const Template = ({ children }) => (
  <section className={classNames.changePasswordWithToken}>
    <Link to='/'><img src={Logo} /></Link>
    <h1>Change Password</h1>
    { children }
  </section>
)

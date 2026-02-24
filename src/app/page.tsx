import { styled } from 'styled-system/jsx'

export default function Home() {
  return (
    <styled.section aria-labelledby="home-heading" px="4" py="6">
      <h1 id="home-heading">WSG Check</h1>
      <p>Checks a website against the W3C Web Sustainability Guidelines.</p>
    </styled.section>
  )
}

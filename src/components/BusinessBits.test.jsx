// The business cards used on Explore Businesses, a business page, My City
// and Home. They render server data, so these check what shows (and what
// doesn't) for typical and missing values.
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { naira, BusinessCard, ListingCard, BusinessLogo } from './BusinessBits.jsx'

const inRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>)

const business = {
  id: 'b-1', name: 'Akinyede Estates', categoryLabel: 'Real estate', city: 'Lagos',
  verified: true, promoted: false, listingsCount: 3, rating: { count: 4, avg: 4.5 }, preview: [],
}
const listing = { id: 'l-1', kind: 'property', title: '4 Bedroom Duplex', price: 220000000, area: 'Lekki, Lagos', status: 'for-sale', image: '' }

describe('naira', () => {
  it('formats with a ₦ sign and thousands separators', () => expect(naira(220000000)).toBe('₦220,000,000'))
  it('shows nothing for a missing price, but shows a zero', () => {
    expect(naira(null)).toBe('')
    expect(naira(undefined)).toBe('')
    expect(naira(0)).toBe('₦0')
  })
})

describe('BusinessLogo', () => {
  it('falls back to initials when there is no logo', () => {
    render(<BusinessLogo business={{ name: 'kola foods ltd' }} />)
    expect(screen.getByText('KF')).toBeInTheDocument()
  })
})

describe('BusinessCard', () => {
  it('links to the business and shows its name, category, city and rating', () => {
    inRouter(<BusinessCard business={business} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/business/b-1')
    expect(link).toHaveTextContent('Akinyede Estates')
    expect(link).toHaveTextContent('Real estate · Lagos')
    expect(link).toHaveTextContent('4.5/5')
    expect(link).toHaveTextContent('3 listings')
  })

  it('says "New on VOIDAJ" with no reviews, and "1 listing" in the singular', () => {
    inRouter(<BusinessCard business={{ ...business, rating: { count: 0 }, listingsCount: 1 }} />)
    expect(screen.getByRole('link')).toHaveTextContent('New on VOIDAJ')
    expect(screen.getByRole('link')).toHaveTextContent('1 listing')
  })

  it('only shows "Promoted" for promoted businesses', () => {
    const { rerender } = inRouter(<BusinessCard business={business} />)
    expect(screen.queryByText('Promoted')).not.toBeInTheDocument()
    rerender(<MemoryRouter><BusinessCard business={{ ...business, promoted: true }} /></MemoryRouter>)
    expect(screen.getByText('Promoted')).toBeInTheDocument()
  })
})

describe('ListingCard', () => {
  it('shows title, price and area, and no For Sale badge (David, Nov 10)', () => {
    inRouter(<ListingCard listing={listing} to="/business/b-1?listing=l-1" />)
    const card = screen.getByRole('link')
    expect(card).toHaveTextContent('4 Bedroom Duplex')
    expect(card).toHaveTextContent('₦220,000,000')
    expect(card).toHaveTextContent('Lekki, Lagos')
    expect(screen.queryByText('For Sale')).not.toBeInTheDocument()
  })

  it('leaves out price and area when a listing has none', () => {
    inRouter(<ListingCard listing={{ ...listing, price: null, area: '' }} to="/x" />)
    expect(screen.getByRole('link')).not.toHaveTextContent('₦')
  })

  it('is a button that calls onOpen when no link is given', async () => {
    const onOpen = vi.fn()
    inRouter(<ListingCard listing={listing} onOpen={onOpen} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onOpen).toHaveBeenCalledOnce()
  })

  it('names the business when given one', () => {
    inRouter(<ListingCard listing={listing} business={business} to="/x" />)
    expect(screen.getByRole('link')).toHaveTextContent('Akinyede Estates')
  })
})

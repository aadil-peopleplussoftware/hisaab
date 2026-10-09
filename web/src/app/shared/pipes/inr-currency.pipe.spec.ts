import { InrCurrencyPipe } from './inr-currency.pipe';

describe('InrCurrencyPipe', () => {
  const pipe = new InrCurrencyPipe();

  it('transforms 125000 to ₹1,25,000.00', () => {
    expect(pipe.transform(125000)).toBe('₹1,25,000.00');
  });

  it('transforms 10000000 to ₹1,00,00,000.00', () => {
    expect(pipe.transform(10000000)).toBe('₹1,00,00,000.00');
  });

  it('transforms decimal numbers correctly', () => {
    expect(pipe.transform(42350.5)).toBe('₹42,350.50');
  });

  it('handles negative amounts', () => {
    expect(pipe.transform(-5000)).toBe('-₹5,000.00');
  });

  it('handles null and undefined', () => {
    expect(pipe.transform(null)).toBe('₹0.00');
    expect(pipe.transform(undefined)).toBe('₹0.00');
  });

  it('supports hiding the symbol', () => {
    expect(pipe.transform(125000, false)).toBe('1,25,000.00');
  });
});


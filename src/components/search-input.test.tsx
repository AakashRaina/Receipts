import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchInput } from './search-input';

describe('SearchInput', () => {
  it('renders with the initial value', () => {
    render(<SearchInput value="coffee" onChange={() => {}} />);
    expect(screen.getByRole('searchbox')).toHaveValue('coffee');
  });

  it('does not call onChange for 1-3 chars and shows helper', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SearchInput value={undefined} onChange={onChange} />);

    await user.type(screen.getByRole('searchbox'), 'abc');
    // Give the debounce a chance to fire if it were going to.
    await new Promise((r) => setTimeout(r, 300));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/at least 4 characters/i)).toBeInTheDocument();
  });

  it('fires onChange with trimmed query at 4+ chars after debounce', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SearchInput value={undefined} onChange={onChange} />);

    await user.type(screen.getByRole('searchbox'), '  oat milk  ');
    await waitFor(() => expect(onChange).toHaveBeenCalled(), { timeout: 1000 });

    expect(onChange).toHaveBeenLastCalledWith('oat milk');
  });

  it('clears via onChange(undefined) when emptied', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SearchInput value="coffee" onChange={onChange} />);

    await user.clear(screen.getByRole('searchbox'));
    await waitFor(
      () => expect(onChange).toHaveBeenLastCalledWith(undefined),
      { timeout: 1000 },
    );
  });

  it('syncs local state when value prop changes externally', () => {
    const { rerender } = render(<SearchInput value="coffee" onChange={() => {}} />);
    expect(screen.getByRole('searchbox')).toHaveValue('coffee');
    rerender(<SearchInput value="oat milk" onChange={() => {}} />);
    expect(screen.getByRole('searchbox')).toHaveValue('oat milk');
  });
});

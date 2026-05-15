import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditableField } from './editable-field';

describe('EditableField', () => {
  it('shows em-dash for null values', () => {
    render(<EditableField label="Vendor" value={null} onSave={async () => {}} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('clicking swaps to an input with the current value', async () => {
    const user = userEvent.setup();
    render(<EditableField label="Vendor" value="Starbucks" onSave={async () => {}} />);

    await user.click(screen.getByRole('button', { name: /Starbucks/i }));
    expect(screen.getByRole('textbox')).toHaveValue('Starbucks');
  });

  it('Enter commits the trimmed value and exits edit mode', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<EditableField label="Vendor" value="Old" onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: /Old/i }));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '  New Vendor  {Enter}');

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('New Vendor'));
  });

  it('empty input commits as null', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<EditableField label="Vendor" value="Old" onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: /Old/i }));
    await user.clear(screen.getByRole('textbox'));
    await user.keyboard('{Enter}');

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(null));
  });

  it('Escape cancels without calling onSave', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<EditableField label="Vendor" value="Old" onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: /Old/i }));
    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), 'unsaved');
    await user.keyboard('{Escape}');

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Old/i })).toBeInTheDocument();
  });

  // Note: there's no "rejects non-numeric input" test here. <input type="number">
  // strips non-digit characters at the input level (both in real browsers and
  // happy-dom), so the parser's NaN branch is a defensive path that's unreachable
  // through normal user interaction. Trusting it via code review rather than a test.

  it('number type passes a real number to onSave', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <EditableField label="Total" type="number" value={100} onSave={onSave} />,
    );

    await user.click(screen.getByRole('button', { name: '100' }));
    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '450.5{Enter}');

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(450.5));
  });

  it('shows amber low-confidence helper text when confidence < 0.7', () => {
    render(
      <EditableField
        label="Total"
        value={100}
        confidence={0.4}
        onSave={async () => {}}
      />,
    );
    expect(screen.getByText(/AI wasn.t sure/i)).toBeInTheDocument();
  });

  it('hides low-confidence helper when confidence >= 0.7', () => {
    render(
      <EditableField
        label="Total"
        value={100}
        confidence={0.9}
        onSave={async () => {}}
      />,
    );
    expect(screen.queryByText(/AI wasn.t sure/i)).not.toBeInTheDocument();
  });

  it('shows error from onSave when commit rejects', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue(new Error('boom'));
    render(<EditableField label="Vendor" value="Old" onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: /Old/i }));
    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), 'New{Enter}');

    await waitFor(() => expect(screen.getByText('boom')).toBeInTheDocument());
  });
});

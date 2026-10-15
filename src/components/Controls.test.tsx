import { fireEvent, render, screen } from '@testing-library/react';
import { Controls } from './Controls';
import { DEFAULT_SETTINGS } from '../domain/settings';

function setup(overrides: Partial<React.ComponentProps<typeof Controls>> = {}) {
  const onChange = vi.fn();
  render(
    <Controls
      settings={DEFAULT_SETTINGS}
      span={[2000, 2020]}
      years={[2005, 2015]}
      skippedPapers={0}
      hidden={0}
      onChange={onChange}
      {...overrides}
    />,
  );
  return onChange;
}

describe('Controls', () => {
  it('names every control with a label that points at it', () => {
    setup();

    expect(screen.getByLabelText('From year')).toHaveValue('2005');
    expect(screen.getByLabelText('To year')).toHaveValue('2015');
    expect(screen.getByLabelText(/Ignore papers with more than this many authors/)).toHaveValue('12');
    expect(screen.getByLabelText('Most people to show')).toHaveValue('60');
  });

  it('keeps the start year from passing the end year', () => {
    const onChange = setup();

    fireEvent.change(screen.getByLabelText('From year'), { target: { value: '2019' } });

    expect(onChange).toHaveBeenCalledWith({ from: 2015 });
  });

  it('keeps the end year from passing the start year', () => {
    const onChange = setup();

    fireEvent.change(screen.getByLabelText('To year'), { target: { value: '2001' } });

    expect(onChange).toHaveBeenCalledWith({ to: 2005 });
  });

  it('stores no choice when a year is moved back to the end of the range', () => {
    const onChange = setup();

    fireEvent.change(screen.getByLabelText('From year'), { target: { value: '2000' } });
    fireEvent.change(screen.getByLabelText('To year'), { target: { value: '2020' } });

    expect(onChange).toHaveBeenNthCalledWith(1, { from: undefined });
    expect(onChange).toHaveBeenNthCalledWith(2, { to: undefined });
  });

  it('changes the author limit and the number of people', () => {
    const onChange = setup();

    fireEvent.change(screen.getByLabelText(/Ignore papers/), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('Most people to show'), { target: { value: '120' } });

    expect(onChange).toHaveBeenNthCalledWith(1, { max: 20 });
    expect(onChange).toHaveBeenNthCalledWith(2, { nodes: 120 });
  });

  it.each([
    [0, /No papers are being ignored/],
    [1, /1 paper is being ignored/],
    [5, /5 papers are being ignored/],
  ])('describes %s ignored papers', (count, text) => {
    setup({ skippedPapers: count });
    expect(screen.getByLabelText(/Ignore papers/)).toHaveAccessibleDescription(text);
  });

  it.each([
    [1, /1 person is hidden/],
    [12, /12 people are hidden/],
  ])('says how many people are hidden', (count, text) => {
    setup({ hidden: count });
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('says nothing about hidden people when none are hidden', () => {
    setup({ hidden: 0 });
    expect(screen.queryByText(/hidden/)).not.toBeInTheDocument();
  });
});

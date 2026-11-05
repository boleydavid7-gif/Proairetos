// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PhytonNav } from '../../phyton/app/App';
import CarePage from '../../phyton/screens/CarePage';
import LookupPage from '../../phyton/screens/LookupPage';
import { IDENTIFY_ON } from '../../phyton/app/identify';
import { findSpecies, SPECIES, TOXIC_TEXT } from '../../phyton/core/species';

const nav = () => ({ go: vi.fn(), swap: vi.fn(), back: vi.fn() }) as unknown as PhytonNav & { go: ReturnType<typeof vi.fn>; swap: ReturnType<typeof vi.fn> };

afterEach(cleanup);

describe('Look up a plant', () => {
  it('keeps photo identification switched off', () => {
    expect(IDENTIFY_ON).toBe(false);
  });

  it('lists matches as you type and opens the care for one', () => {
    const n = nav();
    render(<LookupPage nav={n} />);
    fireEvent.change(screen.getByLabelText('Plant name'), { target: { value: 'devils ivy' } });
    fireEvent.click(screen.getByRole('button', { name: /Pothos/ }));
    expect(n.go).toHaveBeenCalledWith({ name: 'care', species: 'pothos' });
  });

  it('says so when a name is not in the list and offers to add it', () => {
    const n = nav();
    render(<LookupPage nav={n} />);
    fireEvent.change(screen.getByLabelText('Plant name'), { target: { value: 'Zzyzx plant' } });
    expect(screen.getByText(/No care notes for “Zzyzx plant” yet/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Add “Zzyzx plant”/ }));
    expect(n.swap).toHaveBeenCalledWith({ name: 'plant', given: 'Zzyzx plant' });
  });

  it('leads a Latin name from a genus we hold to that plant', () => {
    render(<LookupPage nav={nav()} />);
    fireEvent.change(screen.getByLabelText('Plant name'), { target: { value: 'Monstera adansonii' } });
    expect(screen.getByRole('button', { name: /Monstera/ })).toBeTruthy();
  });
});

describe('Plant care', () => {
  it('shows light, watering, feeding and pets, and adds the plant on request', () => {
    const n = nav();
    render(<CarePage nav={n} species="snake-plant" />);
    expect(screen.getByText('Light')).toBeTruthy();
    expect(screen.getByText(/Water when the soil is dry right through/)).toBeTruthy();
    expect(screen.getByText(TOXIC_TEXT.both)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Add to my plants' }));
    expect(n.swap).toHaveBeenCalledWith({ name: 'plant', species: 'snake-plant' });
  });

  it('names the pet risk for a daylily as cats only, with its note', () => {
    render(<CarePage nav={nav()} species="daylily" />);
    expect(screen.getByText(TOXIC_TEXT.cats)).toBeTruthy();
    expect(screen.getByText(/seriously harm a cat/)).toBeTruthy();
  });

  it('says plainly when a plant is not listed by the ASPCA', () => {
    render(<CarePage nav={nav()} species="dill" />);
    expect(screen.getByText(/Not on the ASPCA list/)).toBeTruthy();
  });
});

describe('The plant list', () => {
  it('holds the types added with the library and finds them by their other names', () => {
    expect(SPECIES.length).toBeGreaterThanOrEqual(170);
    expect(findSpecies('houseleek')[0].key).toBe('hens-and-chicks');
    expect(findSpecies('courgette')[0].key).toBe('zucchini');
    expect(findSpecies('busy lizzie')[0].key).toBe('impatiens');
    expect(findSpecies('garden mum')[0].key).toBe('chrysanthemum');
    expect(findSpecies('tulsi')[0].key).toBe('holy-basil');
    expect(findSpecies('chinese chives')[0].key).toBe('garlic-chives');
    expect(findSpecies('catmint')[0].key).toBe('catnip');
  });
});

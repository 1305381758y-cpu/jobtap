import countryList from 'country-list';

export type CountryOption = { code: string; name: string; englishName: string };

export const COUNTRY_OPTIONS: CountryOption[] = countryList
  .getData()
  .map((entry) => ({
    code: entry.code.toUpperCase(),
    name: entry.name,
    englishName: entry.name,
  }))
  .sort((left, right) => left.name.localeCompare(right.name, 'en'));

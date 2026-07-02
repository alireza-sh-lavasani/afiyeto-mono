export enum EZoba {
  MAEKEL = 'MAEKEL',
  ANSEBA = 'ANSEBA',
  DEBUB = 'DEBUB',
  GASH_BARKA = 'GASH_BARKA',
  NORTHERN_RED_SEA = 'NORTHERN_RED_SEA',
  SOUTHERN_RED_SEA = 'SOUTHERN_RED_SEA',
}

export const zobas: IZoba[] = [
  { title: 'Maekel', value: EZoba.MAEKEL },
  { title: 'Anseba', value: EZoba.ANSEBA },
  { title: 'Debub', value: EZoba.DEBUB },
  { title: 'Gash-Barka', value: EZoba.GASH_BARKA },
  { title: 'Northern Red Sea', value: EZoba.NORTHERN_RED_SEA },
  { title: 'Southern Red Sea', value: EZoba.SOUTHERN_RED_SEA },
];

export interface IZoba {
  title: string;
  value: EZoba;
}

export enum ESubZoba {
  BERIKH = 'Berikh',
  GHALA_NEFHI = 'Ghala Nefhi',
  NORTH_EASTERN = 'North Eastern',
  NORTH_WESTERN = 'North Western',
  SEREJAKA = 'Serejaka',
  SOUTH_EASTERN = 'South Eastern',
  SOUTH_WESTERN = 'South Western',
  ADI_TEKELEZAN = 'Adi Tekelezan',
  ASMAT = 'Asmat',
  ELABERED = 'Elabered',
  GELEB = 'Geleb',
  HAGAZ = 'Hagaz',
  HALHAL = 'Halhal',
  HABERO = 'Habero',
  KEREN_CITY = 'Keren City',
  KERKEBET = 'Kerkebet',
  SELA = 'Sel’a',
  ADI_KEYH = 'Adi Keyh',
  ADI_QUALA = 'Adi Quala',
  AREZA = 'Areza',
  DEBARWA = 'Debarwa',
  DEKEMHARE = 'Dekemhare',
  MAI_MNE = 'Mai-Mne',
  MENDEFERA = 'Mendefera',
  SEGENEITI = 'Segeneiti',
  SENAFE = 'Senafe',
  TSORONA = 'Tsorona',
  AGORDAT_CITY = 'Agordat City',
  BARENTU = 'Barentu',
  DGHE = 'Dghe',
  FORTO = 'Forto',
  GOGNE = 'Gogne',
  HAYKOTA = 'Haykota',
  LOGO_ANSEBA = 'Logo Anseba',
  MENSURA = 'Mensura',
  MOGOLO = 'Mogolo',
  MOLKI = 'Molki',
  OMHAJER = 'Omhajer',
  SHAMBUKO = 'Shambuko',
  TESSENEY = 'Tesseney',
  UPPER_GASH = 'Upper Gash',
  AFABET = 'Afabet',
  DAHLAK = 'Dahlak',
  FORO = 'Foro',
  GHELALO = 'Ghelalo',
  KARURA = 'Karura',
  MASSAWA_CITY = 'Massawa City',
  NAKFA = 'Nakfa',
  SHEEB = 'She’eb',
  AREETA = 'Are’eta',
  CENTRAL_DENKALIA = 'Central Denkalia',
  NORTHERN_DENKALIA = 'Northern Denkalia',
  SOUTHERN_DENKALIA = 'Southern Denkalia',
}

export const subZobas: TSubzobas = {
  [EZoba.MAEKEL]: [
    { title: 'Berikh', value: ESubZoba.BERIKH },
    { title: 'Ghala Nefhi', value: ESubZoba.GHALA_NEFHI },
    { title: 'North Eastern', value: ESubZoba.NORTH_EASTERN },
    { title: 'North Western', value: ESubZoba.NORTH_WESTERN },
    { title: 'Serejaka', value: ESubZoba.SEREJAKA },
    { title: 'South Eastern', value: ESubZoba.SOUTH_EASTERN },
    { title: 'South Western', value: ESubZoba.SOUTH_WESTERN },
  ],
  [EZoba.ANSEBA]: [
    { title: 'Adi Tekelezan', value: ESubZoba.ADI_TEKELEZAN },
    { title: 'Asmat', value: ESubZoba.ASMAT },
    { title: 'Elabered', value: ESubZoba.ELABERED },
    { title: 'Geleb', value: ESubZoba.GELEB },
    { title: 'Hagaz', value: ESubZoba.HAGAZ },
    { title: 'Halhal', value: ESubZoba.HALHAL },
    { title: 'Habero', value: ESubZoba.HABERO },
    { title: 'Keren City', value: ESubZoba.KEREN_CITY },
    { title: 'Kerkebet', value: ESubZoba.KERKEBET },
    { title: 'Sel’a', value: ESubZoba.SELA },
  ],
  [EZoba.DEBUB]: [
    { title: 'Adi Keyh', value: ESubZoba.ADI_KEYH },
    { title: 'Adi Quala', value: ESubZoba.ADI_QUALA },
    { title: 'Areza', value: ESubZoba.AREZA },
    { title: 'Debarwa', value: ESubZoba.DEBARWA },
    { title: 'Dekemhare', value: ESubZoba.DEKEMHARE },
    { title: 'Mai-Mne', value: ESubZoba.MAI_MNE },
    { title: 'Mendefera', value: ESubZoba.MENDEFERA },
    { title: 'Segeneiti', value: ESubZoba.SEGENEITI },
    { title: 'Senafe', value: ESubZoba.SENAFE },
    { title: 'Tsorona', value: ESubZoba.TSORONA },
  ],
  [EZoba.GASH_BARKA]: [
    { title: 'Agordat City', value: ESubZoba.AGORDAT_CITY },
    { title: 'Barentu', value: ESubZoba.BARENTU },
    { title: 'Dghe', value: ESubZoba.DGHE },
    { title: 'Forto', value: ESubZoba.FORTO },
    { title: 'Gogne', value: ESubZoba.GOGNE },
    { title: 'Haykota', value: ESubZoba.HAYKOTA },
    { title: 'Logo Anseba', value: ESubZoba.LOGO_ANSEBA },
    { title: 'Mensura', value: ESubZoba.MENSURA },
    { title: 'Mogolo', value: ESubZoba.MOGOLO },
    { title: 'Molki', value: ESubZoba.MOLKI },
    { title: 'Omhajer', value: ESubZoba.OMHAJER },
    { title: 'Shambuko', value: ESubZoba.SHAMBUKO },
    { title: 'Tesseney', value: ESubZoba.TESSENEY },
    { title: 'Upper Gash', value: ESubZoba.UPPER_GASH },
  ],
  [EZoba.NORTHERN_RED_SEA]: [
    { title: 'Afabet', value: ESubZoba.AFABET },
    { title: 'Dahlak', value: ESubZoba.DAHLAK },
    { title: 'Foro', value: ESubZoba.FORO },
    { title: 'Ghelalo', value: ESubZoba.GHELALO },
    { title: 'Karura', value: ESubZoba.KARURA },
    { title: 'Massawa City', value: ESubZoba.MASSAWA_CITY },
    { title: 'Nakfa', value: ESubZoba.NAKFA },
    { title: 'She’eb', value: ESubZoba.SHEEB },
  ],
  [EZoba.SOUTHERN_RED_SEA]: [
    { title: 'Are’eta', value: ESubZoba.AREETA },
    { title: 'Central Denkalia', value: ESubZoba.CENTRAL_DENKALIA },
    { title: 'Northern Denkalia', value: ESubZoba.NORTHERN_DENKALIA },
    { title: 'Southern Denkalia', value: ESubZoba.SOUTHERN_DENKALIA },
  ],
};

type TSubzobas = {
  [key in EZoba]: ISubZoba[];
};

export interface ISubZoba {
  title: string;
  value: ESubZoba;
}
export default zobas;

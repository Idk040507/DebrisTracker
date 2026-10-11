/**
 * Orbit Mean-Elements Message (OMM) JSON interface representing satellite/debris orbital state.
 * Replaces legacy TLE text string definitions with structured JSON key-value properties.
 */

export interface OMMRecord {
  OBJECT_NAME: string;
  OBJECT_ID?: string;
  NORAD_CAT_ID: number | string;
  EPOCH: string;
  MEAN_MOTION: number;
  ECCENTRICITY: number;
  INCLINATION: number;
  RA_OF_ASC_NODE: number;
  ARG_OF_PERICENTER: number;
  MEAN_ANOMALY: number;
  EPHEMERIS_TYPE?: number;
  CLASSIFICATION_TYPE?: string;
  ELEMENT_SET_NO?: number;
  REV_AT_EPOCH?: number;
  BSTAR?: number;
  MEAN_MOTION_DOT?: number;
  MEAN_MOTION_DDOT?: number;
  SEMIMAJOR_AXIS?: number;
  PERIOD?: number;
  APOAPSIS?: number;
  PERIAPSIS?: number;
  CELESTRAK_GROUP?: string;
  position?: [number, number, number];
  elevated?: boolean;
  polar?: boolean;
  orbitClass?: string;
}

export type TLEString = never; // Deprecated: Replaced by OMMRecord JSON key-value pairs

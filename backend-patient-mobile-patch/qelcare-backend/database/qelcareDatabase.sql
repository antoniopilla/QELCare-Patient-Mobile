--
-- PostgreSQL database dump
--

\restrict rf4Sl96gCL4Eorvp7TsexmhmQJvbDnpV9aqYao4WRdHA1Q6JHMcR6eSCPdPncqc

-- Dumped from database version 18.6 (Debian 18.6-1.pgdg13+2)
-- Dumped by pg_dump version 18.3

-- Started on 2026-10-08 01:07:52

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 282 (class 1255 OID 17053)
-- Name: generate_or_number(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_or_number() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_year INT;
  v_seq INT;
BEGIN
  v_year := EXTRACT(YEAR FROM NOW() AT TIME ZONE 'Asia/Manila')::INT;

  INSERT INTO or_number_seq (year, last_num)
  VALUES (v_year, 1)
  ON CONFLICT (year)
  DO UPDATE SET last_num = or_number_seq.last_num + 1
  RETURNING last_num INTO v_seq;

  RETURN 'QEL-' || v_year::TEXT || '-' || LPAD(v_seq::TEXT, 5, '0');
END;
$$;


ALTER FUNCTION public.generate_or_number() OWNER TO postgres;

--
-- TOC entry 265 (class 1255 OID 17130)
-- Name: generate_queue_number(integer, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_queue_number(p_specialty_id integer, p_date date DEFAULT CURRENT_DATE) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_next INT;
BEGIN
  SELECT COALESCE(MAX(queue_number), 0) + 1
  INTO   v_next
  FROM   queue_entries
  WHERE  specialty_id = p_specialty_id
    AND  queue_date   = p_date;

  RETURN v_next;
END;
$$;


ALTER FUNCTION public.generate_queue_number(p_specialty_id integer, p_date date) OWNER TO postgres;

--
-- TOC entry 283 (class 1255 OID 17144)
-- Name: trigger_auto_create_patient(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_auto_create_patient() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_role_name TEXT;
BEGIN
  SELECT r.role_name
  INTO v_role_name
  FROM roles r
  WHERE r.role_id = NEW.role_id;

  IF v_role_name = 'Patient' AND NEW.status = 'verified' THEN
    INSERT INTO patients (
      user_id,
      name,
      first_name,
      last_name,
      phone,
      contact,
      email,
      gender,
      is_active,
      created_at,
      updated_at
    )
    VALUES (
      NEW.user_id,
      COALESCE(NULLIF(TRIM(CONCAT_WS(' ', NEW.first_name, NEW.last_name)), ''), NEW.username),
      NEW.first_name,
      NEW.last_name,
      NEW.phone,
      NEW.phone,
      NEW.email,
      NEW.gender,
      TRUE,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      name = COALESCE(NULLIF(TRIM(patients.name), ''), EXCLUDED.name),
      first_name = COALESCE(NULLIF(TRIM(patients.first_name), ''), EXCLUDED.first_name),
      last_name = COALESCE(NULLIF(TRIM(patients.last_name), ''), EXCLUDED.last_name),
      phone = COALESCE(NULLIF(TRIM(patients.phone), ''), EXCLUDED.phone),
      contact = COALESCE(NULLIF(TRIM(patients.contact), ''), EXCLUDED.contact),
      email = COALESCE(NULLIF(TRIM(patients.email), ''), EXCLUDED.email),
      gender = COALESCE(NULLIF(TRIM(patients.gender), ''), EXCLUDED.gender),
      is_active = TRUE,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.trigger_auto_create_patient() OWNER TO postgres;

--
-- TOC entry 280 (class 1255 OID 17142)
-- Name: trigger_billing_voided(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_billing_voided() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.status = 'VOIDED' AND OLD.status = 'PAID' THEN
    UPDATE public.appointments
       SET status = 'FOR_BILLING', updated_at = NOW()
     WHERE id = NEW.appointment_id
       AND status = 'COMPLETED';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.trigger_billing_voided() OWNER TO postgres;

--
-- TOC entry 277 (class 1255 OID 17138)
-- Name: trigger_compute_bmi(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_compute_bmi() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_height_m DECIMAL(8,4);
BEGIN
  IF NEW.weight_kg IS NOT NULL AND NEW.height_cm IS NOT NULL AND NEW.height_cm > 0 THEN
    v_height_m := NEW.height_cm / 100.0;
    NEW.bmi := ROUND((NEW.weight_kg / (v_height_m * v_height_m))::NUMERIC, 2);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.trigger_compute_bmi() OWNER TO postgres;

--
-- TOC entry 281 (class 1255 OID 17429)
-- Name: trigger_revoke_tokens_on_user_change(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_revoke_tokens_on_user_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF (NEW.status IN ('deactivated','locked') AND NEW.status IS DISTINCT FROM OLD.status)
     OR (NEW.role_id IS DISTINCT FROM OLD.role_id) THEN
    DELETE FROM public.active_tokens WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.trigger_revoke_tokens_on_user_change() OWNER TO postgres;

--
-- TOC entry 279 (class 1255 OID 17067)
-- Name: trigger_set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.trigger_set_updated_at() OWNER TO postgres;

--
-- TOC entry 278 (class 1255 OID 17140)
-- Name: trigger_sync_patient_name(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_sync_patient_name() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.name := TRIM(COALESCE(NEW.first_name,'') || ' ' || COALESCE(NEW.last_name,''));
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.trigger_sync_patient_name() OWNER TO postgres;

--
-- TOC entry 264 (class 1255 OID 16434)
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 229 (class 1259 OID 16471)
-- Name: active_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.active_tokens (
    token_id integer NOT NULL,
    user_id integer NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.active_tokens OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 16470)
-- Name: active_tokens_token_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.active_tokens_token_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.active_tokens_token_id_seq OWNER TO postgres;

--
-- TOC entry 3846 (class 0 OID 0)
-- Dependencies: 228
-- Name: active_tokens_token_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.active_tokens_token_id_seq OWNED BY public.active_tokens.token_id;


--
-- TOC entry 244 (class 1259 OID 16999)
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_logs (
    log_id integer NOT NULL,
    user_id integer,
    action character varying(80) NOT NULL,
    entity_type character varying(50),
    entity_id integer,
    description text,
    ip_address inet,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.activity_logs OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 16998)
-- Name: activity_logs_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.activity_logs_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activity_logs_log_id_seq OWNER TO postgres;

--
-- TOC entry 3847 (class 0 OID 0)
-- Dependencies: 243
-- Name: activity_logs_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.activity_logs_log_id_seq OWNED BY public.activity_logs.log_id;


--
-- TOC entry 233 (class 1259 OID 16606)
-- Name: appointments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.appointments (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    doctor_id integer NOT NULL,
    date date NOT NULL,
    "time" time without time zone NOT NULL,
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    specialty_id integer,
    type character varying(30) DEFAULT 'consultation'::character varying NOT NULL,
    chief_complaint text,
    booked_by integer,
    cancelled_by integer,
    cancel_reason text,
    booked_for character varying(10) DEFAULT 'self'::character varying NOT NULL,
    booked_for_relationship character varying(80),
    CONSTRAINT appointments_booked_for_check CHECK (((booked_for)::text = ANY (ARRAY['self'::text, 'other'::text]))),
    CONSTRAINT chk_appt_status CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'CONFIRMED'::character varying, 'IN_QUEUE'::character varying, 'FOR_BILLING'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying, 'RESCHEDULED'::character varying, 'NO_SHOW'::character varying])::text[]))),
    CONSTRAINT chk_appt_type CHECK (((type)::text = ANY ((ARRAY['consultation'::character varying, 'follow_up'::character varying, 'walk_in'::character varying, 'emergency'::character varying])::text[])))
);


ALTER TABLE public.appointments OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 16605)
-- Name: appointments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.appointments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.appointments_id_seq OWNER TO postgres;

--
-- TOC entry 3848 (class 0 OID 0)
-- Dependencies: 232
-- Name: appointments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.appointments_id_seq OWNED BY public.appointments.id;


--
-- TOC entry 239 (class 1259 OID 16686)
-- Name: billing; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.billing (
    id integer NOT NULL,
    patient_id integer,
    appointment_id integer,
    cashier_id integer,
    amount numeric(10,2) DEFAULT 0 NOT NULL,
    status character varying(30) DEFAULT 'PAID'::character varying NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    line_items jsonb DEFAULT '[]'::jsonb NOT NULL,
    discount_type character varying(20),
    discount_pct numeric(5,2) DEFAULT 0 NOT NULL,
    discount_amount numeric(10,2) DEFAULT 0 NOT NULL,
    total_amount numeric(10,2) DEFAULT 0 NOT NULL,
    payment_method character varying(30),
    amount_tendered numeric(10,2),
    change_amount numeric(10,2),
    or_number character varying(50),
    paid_at timestamp with time zone,
    subtotal numeric(10,2) DEFAULT 0,
    voided_at timestamp with time zone,
    voided_by integer,
    CONSTRAINT chk_billing_discount_type CHECK (((discount_type)::text = ANY ((ARRAY['none'::character varying, 'manual'::character varying, 'senior'::character varying, 'pwd'::character varying, 'philhealth'::character varying, 'hmo'::character varying, 'other'::character varying])::text[]))),
    CONSTRAINT chk_billing_payment_method CHECK (((payment_method)::text = ANY ((ARRAY['cash'::character varying, 'gcash'::character varying, 'maya'::character varying, 'card'::character varying, 'bank_transfer'::character varying, 'philhealth'::character varying, 'hmo'::character varying, 'other'::character varying])::text[]))),
    CONSTRAINT chk_billing_status CHECK (((status)::text = ANY ((ARRAY['PAID'::character varying, 'VOIDED'::character varying])::text[])))
);


ALTER TABLE public.billing OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 16685)
-- Name: billing_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.billing_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.billing_id_seq OWNER TO postgres;

--
-- TOC entry 3849 (class 0 OID 0)
-- Dependencies: 238
-- Name: billing_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.billing_id_seq OWNED BY public.billing.id;


--
-- TOC entry 263 (class 1259 OID 32808)
-- Name: device_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.device_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token text NOT NULL,
    platform character varying(20) DEFAULT 'android'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    last_seen_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.device_tokens OWNER TO postgres;

--
-- TOC entry 262 (class 1259 OID 32807)
-- Name: device_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.device_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.device_tokens_id_seq OWNER TO postgres;

--
-- TOC entry 3850 (class 0 OID 0)
-- Dependencies: 262
-- Name: device_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.device_tokens_id_seq OWNED BY public.device_tokens.id;


--
-- TOC entry 257 (class 1259 OID 17354)
-- Name: inquiries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inquiries (
    inquiry_id integer NOT NULL,
    full_name character varying(120) NOT NULL,
    email character varying(150),
    phone character varying(30),
    subject character varying(150),
    message text NOT NULL,
    preferred_date date,
    status character varying(20) DEFAULT 'new'::character varying NOT NULL,
    handled_by integer,
    admin_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_inquiry_status CHECK (((status)::text = ANY ((ARRAY['new'::character varying, 'in_progress'::character varying, 'resolved'::character varying, 'archived'::character varying])::text[])))
);


ALTER TABLE public.inquiries OWNER TO postgres;

--
-- TOC entry 256 (class 1259 OID 17353)
-- Name: inquiries_inquiry_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inquiries_inquiry_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inquiries_inquiry_id_seq OWNER TO postgres;

--
-- TOC entry 3851 (class 0 OID 0)
-- Dependencies: 256
-- Name: inquiries_inquiry_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inquiries_inquiry_id_seq OWNED BY public.inquiries.inquiry_id;


--
-- TOC entry 235 (class 1259 OID 16636)
-- Name: medical_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.medical_records (
    record_id integer CONSTRAINT medical_records_id_not_null NOT NULL,
    patient_id integer,
    doctor_id integer,
    visit_date date DEFAULT CURRENT_DATE NOT NULL,
    diagnosis text,
    prescription text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    appointment_id integer,
    created_by integer,
    history_of_illness text,
    physical_exam text,
    treatment_plan text,
    prescriptions text,
    lab_requests text,
    doctor_notes text,
    follow_up_date date,
    follow_up_notes text,
    chief_complaint text,
    is_confidential boolean DEFAULT false,
    vital_id integer
);


ALTER TABLE public.medical_records OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 16635)
-- Name: medical_records_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.medical_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.medical_records_id_seq OWNER TO postgres;

--
-- TOC entry 3852 (class 0 OID 0)
-- Dependencies: 234
-- Name: medical_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.medical_records_id_seq OWNED BY public.medical_records.record_id;


--
-- TOC entry 255 (class 1259 OID 17319)
-- Name: medication_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.medication_logs (
    log_id integer NOT NULL,
    medication_id integer NOT NULL,
    patient_id integer NOT NULL,
    scheduled_date date NOT NULL,
    scheduled_time character varying(5) NOT NULL,
    status character varying(12) DEFAULT 'pending'::character varying NOT NULL,
    taken_at timestamp with time zone,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT medication_logs_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'taken'::character varying, 'skipped'::character varying, 'missed'::character varying])::text[])))
);


ALTER TABLE public.medication_logs OWNER TO postgres;

--
-- TOC entry 254 (class 1259 OID 17318)
-- Name: medication_logs_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.medication_logs_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.medication_logs_log_id_seq OWNER TO postgres;

--
-- TOC entry 3853 (class 0 OID 0)
-- Dependencies: 254
-- Name: medication_logs_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.medication_logs_log_id_seq OWNED BY public.medication_logs.log_id;


--
-- TOC entry 251 (class 1259 OID 17237)
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    type character varying(50) DEFAULT 'info'::character varying NOT NULL,
    title character varying(180) NOT NULL,
    message text NOT NULL,
    link text,
    appointment_id integer,
    is_read boolean DEFAULT false NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    read_at timestamp without time zone
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- TOC entry 250 (class 1259 OID 17236)
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.notifications ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 247 (class 1259 OID 17172)
-- Name: or_number_seq; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.or_number_seq (
    year integer NOT NULL,
    last_num integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.or_number_seq OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 16456)
-- Name: otp_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.otp_requests (
    email character varying(100) NOT NULL,
    otp_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    request_count integer DEFAULT 1 NOT NULL,
    last_request_at timestamp with time zone DEFAULT now() NOT NULL,
    otp_id integer NOT NULL,
    code character varying(10),
    purpose character varying(30) DEFAULT 'password_reset'::character varying NOT NULL,
    used boolean DEFAULT false NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT otp_requests_purpose_mobile_check CHECK (((purpose)::text = ANY ((ARRAY['password_reset'::character varying, 'registration'::character varying, 'email_verification'::character varying, 'profile_update'::character varying])::text[])))
);


ALTER TABLE public.otp_requests OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 16980)
-- Name: otp_requests_otp_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.otp_requests_otp_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.otp_requests_otp_id_seq OWNER TO postgres;

--
-- TOC entry 3854 (class 0 OID 0)
-- Dependencies: 242
-- Name: otp_requests_otp_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.otp_requests_otp_id_seq OWNED BY public.otp_requests.otp_id;


--
-- TOC entry 261 (class 1259 OID 24587)
-- Name: password_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_history (
    id integer NOT NULL,
    user_id integer NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.password_history OWNER TO postgres;

--
-- TOC entry 260 (class 1259 OID 24586)
-- Name: password_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.password_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_history_id_seq OWNER TO postgres;

--
-- TOC entry 3855 (class 0 OID 0)
-- Dependencies: 260
-- Name: password_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.password_history_id_seq OWNED BY public.password_history.id;


--
-- TOC entry 249 (class 1259 OID 17194)
-- Name: patient_medical_results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.patient_medical_results (
    result_id integer NOT NULL,
    patient_id integer NOT NULL,
    uploaded_by integer NOT NULL,
    title character varying(200) NOT NULL,
    result_type character varying(100),
    source_facility character varying(200),
    result_date date,
    extracted_text text,
    summary_notes text,
    file_url text,
    file_public_id text,
    file_mime character varying(120),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.patient_medical_results OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 17193)
-- Name: patient_medical_results_result_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.patient_medical_results_result_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.patient_medical_results_result_id_seq OWNER TO postgres;

--
-- TOC entry 3856 (class 0 OID 0)
-- Dependencies: 248
-- Name: patient_medical_results_result_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.patient_medical_results_result_id_seq OWNED BY public.patient_medical_results.result_id;


--
-- TOC entry 253 (class 1259 OID 17276)
-- Name: patient_medications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.patient_medications (
    medication_id integer NOT NULL,
    patient_id integer NOT NULL,
    created_by integer,
    drug_name character varying(160) NOT NULL,
    dosage character varying(120),
    form character varying(60),
    instructions text,
    frequency_per_day integer DEFAULT 1 NOT NULL,
    times_of_day jsonb DEFAULT '[]'::jsonb NOT NULL,
    start_date date DEFAULT ((now() AT TIME ZONE 'Asia/Manila'::text))::date NOT NULL,
    end_date date,
    duration_days integer,
    source character varying(20) DEFAULT 'manual'::character varying NOT NULL,
    source_result_id integer,
    reminders_enabled boolean DEFAULT true NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    approval_status character varying(20) DEFAULT 'approved'::character varying NOT NULL,
    approved_by integer,
    approved_at timestamp with time zone,
    rejection_reason text,
    CONSTRAINT chk_med_approval CHECK (((approval_status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[]))),
    CONSTRAINT patient_medications_frequency_per_day_check CHECK (((frequency_per_day >= 1) AND (frequency_per_day <= 12))),
    CONSTRAINT patient_medications_source_check CHECK (((source)::text = ANY ((ARRAY['manual'::character varying, 'ocr'::character varying, 'doctor'::character varying])::text[]))),
    CONSTRAINT patient_medications_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'paused'::character varying, 'finished'::character varying, 'archived'::character varying])::text[])))
);


ALTER TABLE public.patient_medications OWNER TO postgres;

--
-- TOC entry 252 (class 1259 OID 17275)
-- Name: patient_medications_medication_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.patient_medications_medication_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.patient_medications_medication_id_seq OWNER TO postgres;

--
-- TOC entry 3857 (class 0 OID 0)
-- Dependencies: 252
-- Name: patient_medications_medication_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.patient_medications_medication_id_seq OWNED BY public.patient_medications.medication_id;


--
-- TOC entry 259 (class 1259 OID 17390)
-- Name: patient_relatives; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.patient_relatives (
    relative_id integer NOT NULL,
    owner_user_id integer NOT NULL,
    first_name character varying(80) NOT NULL,
    last_name character varying(80) NOT NULL,
    relationship character varying(80) NOT NULL,
    date_of_birth date,
    age integer,
    gender character varying(20),
    phone character varying(30),
    email character varying(150),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.patient_relatives OWNER TO postgres;

--
-- TOC entry 258 (class 1259 OID 17389)
-- Name: patient_relatives_relative_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.patient_relatives_relative_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.patient_relatives_relative_id_seq OWNER TO postgres;

--
-- TOC entry 3858 (class 0 OID 0)
-- Dependencies: 258
-- Name: patient_relatives_relative_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.patient_relatives_relative_id_seq OWNED BY public.patient_relatives.relative_id;


--
-- TOC entry 231 (class 1259 OID 16497)
-- Name: patients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.patients (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    age integer,
    contact character varying(50),
    address text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    user_id integer,
    first_name character varying(80),
    last_name character varying(80),
    middle_name character varying(80),
    suffix character varying(20),
    date_of_birth date,
    gender character varying(20),
    blood_type character varying(5),
    phone character varying(30),
    email character varying(150),
    emergency_contact_name character varying(120),
    emergency_contact_phone character varying(30),
    emergency_contact_relation character varying(50),
    philhealth_no character varying(50),
    senior_pwd_id character varying(50),
    is_active boolean DEFAULT true NOT NULL,
    created_by integer,
    notes text
);


ALTER TABLE public.patients OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 16496)
-- Name: patients_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.patients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.patients_id_seq OWNER TO postgres;

--
-- TOC entry 3859 (class 0 OID 0)
-- Dependencies: 230
-- Name: patients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.patients_id_seq OWNED BY public.patients.id;


--
-- TOC entry 246 (class 1259 OID 17017)
-- Name: queue_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.queue_entries (
    queue_id integer NOT NULL,
    appointment_id integer NOT NULL,
    specialty_id integer NOT NULL,
    queue_number integer NOT NULL,
    queue_date date DEFAULT CURRENT_DATE NOT NULL,
    status character varying(20) DEFAULT 'WAITING'::character varying NOT NULL,
    called_at timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    priority integer DEFAULT 0,
    CONSTRAINT chk_queue_status CHECK (((status)::text = ANY ((ARRAY['WAITING'::character varying, 'CALLED'::character varying, 'IN_PROGRESS'::character varying, 'DONE'::character varying, 'SKIPPED'::character varying, 'NO_SHOW'::character varying, 'CANCELLED'::character varying])::text[])))
);


ALTER TABLE public.queue_entries OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 17016)
-- Name: queue_entries_queue_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.queue_entries_queue_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.queue_entries_queue_id_seq OWNER TO postgres;

--
-- TOC entry 3860 (class 0 OID 0)
-- Dependencies: 245
-- Name: queue_entries_queue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.queue_entries_queue_id_seq OWNED BY public.queue_entries.queue_id;


--
-- TOC entry 222 (class 1259 OID 16390)
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    role_id integer NOT NULL,
    role_name character varying(50) NOT NULL
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16389)
-- Name: roles_role_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_role_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_role_id_seq OWNER TO postgres;

--
-- TOC entry 3861 (class 0 OID 0)
-- Dependencies: 221
-- Name: roles_role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_role_id_seq OWNED BY public.roles.role_id;


--
-- TOC entry 241 (class 1259 OID 16909)
-- Name: specialties; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.specialties (
    specialty_id integer NOT NULL,
    specialty_name character varying(100) NOT NULL,
    slug character varying(100),
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    description text
);


ALTER TABLE public.specialties OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 16908)
-- Name: specialties_specialty_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.specialties_specialty_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.specialties_specialty_id_seq OWNER TO postgres;

--
-- TOC entry 3862 (class 0 OID 0)
-- Dependencies: 240
-- Name: specialties_specialty_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.specialties_specialty_id_seq OWNED BY public.specialties.specialty_id;


--
-- TOC entry 226 (class 1259 OID 16437)
-- Name: user_addresses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_addresses (
    address_id integer NOT NULL,
    user_id integer NOT NULL,
    region_code character varying(10),
    province_code character varying(10),
    municipality_code character varying(10),
    barangay_code character varying(10),
    address_line text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_addresses OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16436)
-- Name: user_addresses_address_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_addresses_address_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_addresses_address_id_seq OWNER TO postgres;

--
-- TOC entry 3863 (class 0 OID 0)
-- Dependencies: 225
-- Name: user_addresses_address_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_addresses_address_id_seq OWNED BY public.user_addresses.address_id;


--
-- TOC entry 224 (class 1259 OID 16401)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    user_id integer NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(100) NOT NULL,
    password text NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    middle_name character varying(50),
    suffix character varying(10),
    phone character varying(20),
    alternate_phone character varying(20),
    gender character varying(10),
    date_of_birth date,
    profile_picture text,
    role_id integer NOT NULL,
    status character varying(20) DEFAULT 'verified'::character varying NOT NULL,
    failed_login_attempts integer DEFAULT 0 NOT NULL,
    lockout_until timestamp with time zone,
    last_login timestamp with time zone,
    email_changed_at timestamp with time zone,
    password_changed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    specialty_id integer,
    privacy_agreed_at timestamp with time zone,
    privacy_version character varying(20),
    CONSTRAINT chk_user_status CHECK (((status)::text = ANY ((ARRAY['unverified'::character varying, 'verified'::character varying, 'deactivated'::character varying, 'locked'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16400)
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_user_id_seq OWNER TO postgres;

--
-- TOC entry 3864 (class 0 OID 0)
-- Dependencies: 223
-- Name: users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;


--
-- TOC entry 237 (class 1259 OID 16660)
-- Name: vitals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vitals (
    id integer NOT NULL,
    patient_id integer,
    appointment_id integer,
    nurse_id integer,
    blood_pressure character varying(20),
    heart_rate integer,
    temperature numeric(4,1),
    weight numeric(5,1),
    height numeric(5,1),
    oxygen_sat integer,
    notes text,
    recorded_at timestamp with time zone DEFAULT now(),
    o2_saturation numeric(5,2),
    lmp date,
    chief_complaint text,
    nurse_notes text,
    routed_to_specialty_id integer
);


ALTER TABLE public.vitals OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 16659)
-- Name: vitals_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.vitals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vitals_id_seq OWNER TO postgres;

--
-- TOC entry 3865 (class 0 OID 0)
-- Dependencies: 236
-- Name: vitals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.vitals_id_seq OWNED BY public.vitals.id;


--
-- TOC entry 3420 (class 2604 OID 16474)
-- Name: active_tokens token_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.active_tokens ALTER COLUMN token_id SET DEFAULT nextval('public.active_tokens_token_id_seq'::regclass);


--
-- TOC entry 3452 (class 2604 OID 17002)
-- Name: activity_logs log_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs ALTER COLUMN log_id SET DEFAULT nextval('public.activity_logs_log_id_seq'::regclass);


--
-- TOC entry 3426 (class 2604 OID 16609)
-- Name: appointments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments ALTER COLUMN id SET DEFAULT nextval('public.appointments_id_seq'::regclass);


--
-- TOC entry 3439 (class 2604 OID 16689)
-- Name: billing id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing ALTER COLUMN id SET DEFAULT nextval('public.billing_id_seq'::regclass);


--
-- TOC entry 3491 (class 2604 OID 32811)
-- Name: device_tokens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_tokens ALTER COLUMN id SET DEFAULT nextval('public.device_tokens_id_seq'::regclass);


--
-- TOC entry 3482 (class 2604 OID 17357)
-- Name: inquiries inquiry_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inquiries ALTER COLUMN inquiry_id SET DEFAULT nextval('public.inquiries_inquiry_id_seq'::regclass);


--
-- TOC entry 3432 (class 2604 OID 16639)
-- Name: medical_records record_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medical_records ALTER COLUMN record_id SET DEFAULT nextval('public.medical_records_id_seq'::regclass);


--
-- TOC entry 3478 (class 2604 OID 17322)
-- Name: medication_logs log_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medication_logs ALTER COLUMN log_id SET DEFAULT nextval('public.medication_logs_log_id_seq'::regclass);


--
-- TOC entry 3415 (class 2604 OID 16981)
-- Name: otp_requests otp_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.otp_requests ALTER COLUMN otp_id SET DEFAULT nextval('public.otp_requests_otp_id_seq'::regclass);


--
-- TOC entry 3489 (class 2604 OID 24590)
-- Name: password_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_history ALTER COLUMN id SET DEFAULT nextval('public.password_history_id_seq'::regclass);


--
-- TOC entry 3461 (class 2604 OID 17197)
-- Name: patient_medical_results result_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_medical_results ALTER COLUMN result_id SET DEFAULT nextval('public.patient_medical_results_result_id_seq'::regclass);


--
-- TOC entry 3468 (class 2604 OID 17279)
-- Name: patient_medications medication_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_medications ALTER COLUMN medication_id SET DEFAULT nextval('public.patient_medications_medication_id_seq'::regclass);


--
-- TOC entry 3486 (class 2604 OID 17393)
-- Name: patient_relatives relative_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_relatives ALTER COLUMN relative_id SET DEFAULT nextval('public.patient_relatives_relative_id_seq'::regclass);


--
-- TOC entry 3422 (class 2604 OID 16500)
-- Name: patients id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients ALTER COLUMN id SET DEFAULT nextval('public.patients_id_seq'::regclass);


--
-- TOC entry 3454 (class 2604 OID 17020)
-- Name: queue_entries queue_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.queue_entries ALTER COLUMN queue_id SET DEFAULT nextval('public.queue_entries_queue_id_seq'::regclass);


--
-- TOC entry 3404 (class 2604 OID 16393)
-- Name: roles role_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN role_id SET DEFAULT nextval('public.roles_role_id_seq'::regclass);


--
-- TOC entry 3449 (class 2604 OID 16912)
-- Name: specialties specialty_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specialties ALTER COLUMN specialty_id SET DEFAULT nextval('public.specialties_specialty_id_seq'::regclass);


--
-- TOC entry 3410 (class 2604 OID 16440)
-- Name: user_addresses address_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_addresses ALTER COLUMN address_id SET DEFAULT nextval('public.user_addresses_address_id_seq'::regclass);


--
-- TOC entry 3405 (class 2604 OID 16404)
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);


--
-- TOC entry 3437 (class 2604 OID 16663)
-- Name: vitals id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vitals ALTER COLUMN id SET DEFAULT nextval('public.vitals_id_seq'::regclass);


--
-- TOC entry 3536 (class 2606 OID 16484)
-- Name: active_tokens active_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.active_tokens
    ADD CONSTRAINT active_tokens_pkey PRIMARY KEY (token_id);


--
-- TOC entry 3538 (class 2606 OID 16486)
-- Name: active_tokens active_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.active_tokens
    ADD CONSTRAINT active_tokens_token_key UNIQUE (token);


--
-- TOC entry 3588 (class 2606 OID 17010)
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (log_id);


--
-- TOC entry 3548 (class 2606 OID 16623)
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- TOC entry 3571 (class 2606 OID 16976)
-- Name: billing billing_or_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing
    ADD CONSTRAINT billing_or_number_key UNIQUE (or_number);


--
-- TOC entry 3573 (class 2606 OID 16699)
-- Name: billing billing_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing
    ADD CONSTRAINT billing_pkey PRIMARY KEY (id);


--
-- TOC entry 3637 (class 2606 OID 32822)
-- Name: device_tokens device_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_tokens
    ADD CONSTRAINT device_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 3639 (class 2606 OID 32824)
-- Name: device_tokens device_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_tokens
    ADD CONSTRAINT device_tokens_token_key UNIQUE (token);


--
-- TOC entry 3629 (class 2606 OID 17371)
-- Name: inquiries inquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inquiries
    ADD CONSTRAINT inquiries_pkey PRIMARY KEY (inquiry_id);


--
-- TOC entry 3564 (class 2606 OID 16648)
-- Name: medical_records medical_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_pkey PRIMARY KEY (record_id);


--
-- TOC entry 3623 (class 2606 OID 17338)
-- Name: medication_logs medication_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medication_logs
    ADD CONSTRAINT medication_logs_pkey PRIMARY KEY (log_id);


--
-- TOC entry 3625 (class 2606 OID 17340)
-- Name: medication_logs medication_logs_unique_slot; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medication_logs
    ADD CONSTRAINT medication_logs_unique_slot UNIQUE (medication_id, scheduled_date, scheduled_time);


--
-- TOC entry 3614 (class 2606 OID 17255)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 3603 (class 2606 OID 17179)
-- Name: or_number_seq or_number_seq_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.or_number_seq
    ADD CONSTRAINT or_number_seq_pkey PRIMARY KEY (year);


--
-- TOC entry 3534 (class 2606 OID 17273)
-- Name: otp_requests otp_requests_email_purpose_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.otp_requests
    ADD CONSTRAINT otp_requests_email_purpose_pkey PRIMARY KEY (email, purpose);


--
-- TOC entry 3635 (class 2606 OID 24599)
-- Name: password_history password_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_history
    ADD CONSTRAINT password_history_pkey PRIMARY KEY (id);


--
-- TOC entry 3609 (class 2606 OID 17209)
-- Name: patient_medical_results patient_medical_results_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_medical_results
    ADD CONSTRAINT patient_medical_results_pkey PRIMARY KEY (result_id);


--
-- TOC entry 3619 (class 2606 OID 17305)
-- Name: patient_medications patient_medications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_medications
    ADD CONSTRAINT patient_medications_pkey PRIMARY KEY (medication_id);


--
-- TOC entry 3632 (class 2606 OID 17404)
-- Name: patient_relatives patient_relatives_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_relatives
    ADD CONSTRAINT patient_relatives_pkey PRIMARY KEY (relative_id);


--
-- TOC entry 3544 (class 2606 OID 16508)
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- TOC entry 3546 (class 2606 OID 16927)
-- Name: patients patients_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_user_id_key UNIQUE (user_id);


--
-- TOC entry 3597 (class 2606 OID 17039)
-- Name: queue_entries queue_entries_appointment_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.queue_entries
    ADD CONSTRAINT queue_entries_appointment_id_key UNIQUE (appointment_id);


--
-- TOC entry 3599 (class 2606 OID 17037)
-- Name: queue_entries queue_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.queue_entries
    ADD CONSTRAINT queue_entries_pkey PRIMARY KEY (queue_id);


--
-- TOC entry 3601 (class 2606 OID 17041)
-- Name: queue_entries queue_unique_number_per_day; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.queue_entries
    ADD CONSTRAINT queue_unique_number_per_day UNIQUE (specialty_id, queue_number, queue_date);


--
-- TOC entry 3512 (class 2606 OID 16397)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (role_id);


--
-- TOC entry 3514 (class 2606 OID 16399)
-- Name: roles roles_role_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_role_name_key UNIQUE (role_name);


--
-- TOC entry 3582 (class 2606 OID 16916)
-- Name: specialties specialties_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specialties
    ADD CONSTRAINT specialties_pkey PRIMARY KEY (specialty_id);


--
-- TOC entry 3584 (class 2606 OID 17093)
-- Name: specialties specialties_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specialties
    ADD CONSTRAINT specialties_slug_key UNIQUE (slug);


--
-- TOC entry 3586 (class 2606 OID 16918)
-- Name: specialties specialties_specialty_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specialties
    ADD CONSTRAINT specialties_specialty_name_key UNIQUE (specialty_name);


--
-- TOC entry 3527 (class 2606 OID 16448)
-- Name: user_addresses user_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_addresses
    ADD CONSTRAINT user_addresses_pkey PRIMARY KEY (address_id);


--
-- TOC entry 3529 (class 2606 OID 16450)
-- Name: user_addresses user_addresses_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_addresses
    ADD CONSTRAINT user_addresses_user_id_key UNIQUE (user_id);


--
-- TOC entry 3521 (class 2606 OID 16428)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 3523 (class 2606 OID 16424)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- TOC entry 3525 (class 2606 OID 16426)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- TOC entry 3569 (class 2606 OID 16669)
-- Name: vitals vitals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vitals
    ADD CONSTRAINT vitals_pkey PRIMARY KEY (id);


--
-- TOC entry 3539 (class 1259 OID 16493)
-- Name: idx_active_tokens_expires; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_active_tokens_expires ON public.active_tokens USING btree (expires_at);


--
-- TOC entry 3540 (class 1259 OID 16492)
-- Name: idx_active_tokens_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_active_tokens_user ON public.active_tokens USING btree (user_id);


--
-- TOC entry 3549 (class 1259 OID 17266)
-- Name: idx_appointments_booked_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_appointments_booked_by ON public.appointments USING btree (booked_by);


--
-- TOC entry 3550 (class 1259 OID 17267)
-- Name: idx_appointments_booked_for; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_appointments_booked_for ON public.appointments USING btree (booked_for);


--
-- TOC entry 3551 (class 1259 OID 17059)
-- Name: idx_appt_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_appt_date ON public.appointments USING btree (date);


--
-- TOC entry 3552 (class 1259 OID 17057)
-- Name: idx_appt_specialty; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_appt_specialty ON public.appointments USING btree (specialty_id);


--
-- TOC entry 3553 (class 1259 OID 17058)
-- Name: idx_appt_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_appt_status ON public.appointments USING btree (status);


--
-- TOC entry 3554 (class 1259 OID 24606)
-- Name: idx_appts_cancelled_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_appts_cancelled_by ON public.appointments USING btree (cancelled_by, updated_at DESC) WHERE ((status)::text = 'CANCELLED'::text);


--
-- TOC entry 3555 (class 1259 OID 17120)
-- Name: idx_appts_date_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_appts_date_status ON public.appointments USING btree (date, status);


--
-- TOC entry 3556 (class 1259 OID 17119)
-- Name: idx_appts_doctor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_appts_doctor_id ON public.appointments USING btree (doctor_id);


--
-- TOC entry 3557 (class 1259 OID 17118)
-- Name: idx_appts_patient_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_appts_patient_id ON public.appointments USING btree (patient_id);


--
-- TOC entry 3574 (class 1259 OID 17426)
-- Name: idx_billing_appointment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_billing_appointment_id ON public.billing USING btree (appointment_id);


--
-- TOC entry 3575 (class 1259 OID 17427)
-- Name: idx_billing_cashier_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_billing_cashier_id ON public.billing USING btree (cashier_id);


--
-- TOC entry 3576 (class 1259 OID 17127)
-- Name: idx_billing_or_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_billing_or_number ON public.billing USING btree (or_number);


--
-- TOC entry 3577 (class 1259 OID 17128)
-- Name: idx_billing_paid_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_billing_paid_at ON public.billing USING btree (paid_at);


--
-- TOC entry 3578 (class 1259 OID 17126)
-- Name: idx_billing_patient_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_billing_patient_id ON public.billing USING btree (patient_id);


--
-- TOC entry 3579 (class 1259 OID 17062)
-- Name: idx_billing_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_billing_status ON public.billing USING btree (status);


--
-- TOC entry 3640 (class 1259 OID 32830)
-- Name: idx_device_tokens_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_device_tokens_user_id ON public.device_tokens USING btree (user_id);


--
-- TOC entry 3626 (class 1259 OID 17378)
-- Name: idx_inquiries_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inquiries_created_at ON public.inquiries USING btree (created_at);


--
-- TOC entry 3627 (class 1259 OID 17377)
-- Name: idx_inquiries_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inquiries_status ON public.inquiries USING btree (status);


--
-- TOC entry 3589 (class 1259 OID 17066)
-- Name: idx_logs_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_logs_action ON public.activity_logs USING btree (action);


--
-- TOC entry 3590 (class 1259 OID 17065)
-- Name: idx_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_logs_created_at ON public.activity_logs USING btree (created_at DESC);


--
-- TOC entry 3591 (class 1259 OID 17129)
-- Name: idx_logs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_logs_user_id ON public.activity_logs USING btree (user_id);


--
-- TOC entry 3559 (class 1259 OID 17152)
-- Name: idx_medical_records_visit_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_medical_records_visit_date ON public.medical_records USING btree (visit_date);


--
-- TOC entry 3560 (class 1259 OID 17151)
-- Name: idx_medical_records_vital_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_medical_records_vital_id ON public.medical_records USING btree (vital_id);


--
-- TOC entry 3620 (class 1259 OID 17352)
-- Name: idx_medication_logs_medication; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_medication_logs_medication ON public.medication_logs USING btree (medication_id);


--
-- TOC entry 3621 (class 1259 OID 17351)
-- Name: idx_medication_logs_patient_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_medication_logs_patient_date ON public.medication_logs USING btree (patient_id, scheduled_date);


--
-- TOC entry 3610 (class 1259 OID 17270)
-- Name: idx_notifications_appointment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_appointment ON public.notifications USING btree (appointment_id);


--
-- TOC entry 3611 (class 1259 OID 17268)
-- Name: idx_notifications_user_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_created ON public.notifications USING btree (user_id, created_at DESC);


--
-- TOC entry 3612 (class 1259 OID 17269)
-- Name: idx_notifications_user_unread; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id, is_read, created_at DESC);


--
-- TOC entry 3530 (class 1259 OID 17229)
-- Name: idx_otp_requests_email_lower; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_otp_requests_email_lower ON public.otp_requests USING btree (lower((email)::text));


--
-- TOC entry 3531 (class 1259 OID 17274)
-- Name: idx_otp_requests_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_otp_requests_expires_at ON public.otp_requests USING btree (expires_at);


--
-- TOC entry 3532 (class 1259 OID 17230)
-- Name: idx_otp_requests_purpose; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_otp_requests_purpose ON public.otp_requests USING btree (purpose);


--
-- TOC entry 3633 (class 1259 OID 24605)
-- Name: idx_password_history_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_history_user ON public.password_history USING btree (user_id, created_at DESC);


--
-- TOC entry 3615 (class 1259 OID 17388)
-- Name: idx_patient_medications_approval; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_medications_approval ON public.patient_medications USING btree (approval_status);


--
-- TOC entry 3616 (class 1259 OID 17316)
-- Name: idx_patient_medications_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_medications_patient ON public.patient_medications USING btree (patient_id, deleted_at);


--
-- TOC entry 3617 (class 1259 OID 17317)
-- Name: idx_patient_medications_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_medications_status ON public.patient_medications USING btree (status);


--
-- TOC entry 3630 (class 1259 OID 17410)
-- Name: idx_patient_relatives_owner; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_relatives_owner ON public.patient_relatives USING btree (owner_user_id);


--
-- TOC entry 3604 (class 1259 OID 17223)
-- Name: idx_patient_results_not_deleted; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_results_not_deleted ON public.patient_medical_results USING btree (patient_id, deleted_at);


--
-- TOC entry 3605 (class 1259 OID 17220)
-- Name: idx_patient_results_patient_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_results_patient_id ON public.patient_medical_results USING btree (patient_id);


--
-- TOC entry 3606 (class 1259 OID 17222)
-- Name: idx_patient_results_result_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_results_result_date ON public.patient_medical_results USING btree (result_date DESC);


--
-- TOC entry 3607 (class 1259 OID 17221)
-- Name: idx_patient_results_uploaded_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_results_uploaded_by ON public.patient_medical_results USING btree (uploaded_by);


--
-- TOC entry 3541 (class 1259 OID 17056)
-- Name: idx_patients_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patients_is_active ON public.patients USING btree (is_active);


--
-- TOC entry 3542 (class 1259 OID 17055)
-- Name: idx_patients_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patients_user_id ON public.patients USING btree (user_id);


--
-- TOC entry 3592 (class 1259 OID 17064)
-- Name: idx_queue_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_queue_date ON public.queue_entries USING btree (queue_date);


--
-- TOC entry 3593 (class 1259 OID 17063)
-- Name: idx_queue_specialty; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_queue_specialty ON public.queue_entries USING btree (specialty_id);


--
-- TOC entry 3594 (class 1259 OID 17124)
-- Name: idx_queue_specialty_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_queue_specialty_date ON public.queue_entries USING btree (specialty_id, queue_date);


--
-- TOC entry 3595 (class 1259 OID 17125)
-- Name: idx_queue_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_queue_status ON public.queue_entries USING btree (status);


--
-- TOC entry 3561 (class 1259 OID 17061)
-- Name: idx_records_appt; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_records_appt ON public.medical_records USING btree (appointment_id);


--
-- TOC entry 3562 (class 1259 OID 17123)
-- Name: idx_records_patient_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_records_patient_id ON public.medical_records USING btree (patient_id);


--
-- TOC entry 3515 (class 1259 OID 17114)
-- Name: idx_users_role_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role_id ON public.users USING btree (role_id);


--
-- TOC entry 3516 (class 1259 OID 17180)
-- Name: idx_users_specialty_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_specialty_id ON public.users USING btree (specialty_id);


--
-- TOC entry 3517 (class 1259 OID 17115)
-- Name: idx_users_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_status ON public.users USING btree (status);


--
-- TOC entry 3566 (class 1259 OID 17122)
-- Name: idx_vitals_appt_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vitals_appt_id ON public.vitals USING btree (appointment_id);


--
-- TOC entry 3567 (class 1259 OID 17121)
-- Name: idx_vitals_patient_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vitals_patient_id ON public.vitals USING btree (patient_id);


--
-- TOC entry 3580 (class 1259 OID 17428)
-- Name: uq_billing_appt_paid; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_billing_appt_paid ON public.billing USING btree (appointment_id) WHERE ((status)::text = 'PAID'::text);


--
-- TOC entry 3558 (class 1259 OID 24608)
-- Name: uq_doctor_datetime; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_doctor_datetime ON public.appointments USING btree (doctor_id, date, "time") WHERE ((status)::text = ANY ((ARRAY['CONFIRMED'::character varying, 'IN_QUEUE'::character varying, 'FOR_BILLING'::character varying, 'COMPLETED'::character varying])::text[]));


--
-- TOC entry 3565 (class 1259 OID 32841)
-- Name: uq_medical_records_appointment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_medical_records_appointment ON public.medical_records USING btree (appointment_id) WHERE (appointment_id IS NOT NULL);


--
-- TOC entry 3518 (class 1259 OID 17431)
-- Name: uq_users_email_lower; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_users_email_lower ON public.users USING btree (lower((email)::text));


--
-- TOC entry 3519 (class 1259 OID 17432)
-- Name: uq_users_username_lower; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_users_username_lower ON public.users USING btree (lower((username)::text));


--
-- TOC entry 3688 (class 2620 OID 17071)
-- Name: appointments set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- TOC entry 3690 (class 2620 OID 17073)
-- Name: billing set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.billing FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- TOC entry 3689 (class 2620 OID 17072)
-- Name: medical_records set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.medical_records FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- TOC entry 3686 (class 2620 OID 17070)
-- Name: patients set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- TOC entry 3692 (class 2620 OID 17074)
-- Name: queue_entries set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.queue_entries FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- TOC entry 3685 (class 2620 OID 17069)
-- Name: user_addresses set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_addresses FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- TOC entry 3682 (class 2620 OID 17068)
-- Name: users set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- TOC entry 3683 (class 2620 OID 17226)
-- Name: users trg_auto_create_patient; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_auto_create_patient AFTER INSERT OR UPDATE OF status, role_id ON public.users FOR EACH ROW EXECUTE FUNCTION public.trigger_auto_create_patient();


--
-- TOC entry 3691 (class 2620 OID 17227)
-- Name: billing trg_billing_voided; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_billing_voided AFTER UPDATE OF status ON public.billing FOR EACH ROW EXECUTE FUNCTION public.trigger_billing_voided();


--
-- TOC entry 3693 (class 2620 OID 17231)
-- Name: patient_medical_results trg_patient_medical_results_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_patient_medical_results_updated_at BEFORE UPDATE ON public.patient_medical_results FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- TOC entry 3684 (class 2620 OID 17430)
-- Name: users trg_revoke_tokens_on_user_change; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_revoke_tokens_on_user_change AFTER UPDATE OF status, role_id ON public.users FOR EACH ROW EXECUTE FUNCTION public.trigger_revoke_tokens_on_user_change();


--
-- TOC entry 3687 (class 2620 OID 17141)
-- Name: patients trg_sync_patient_name; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_sync_patient_name BEFORE INSERT OR UPDATE OF first_name, last_name ON public.patients FOR EACH ROW EXECUTE FUNCTION public.trigger_sync_patient_name();


--
-- TOC entry 3645 (class 2606 OID 16487)
-- Name: active_tokens active_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.active_tokens
    ADD CONSTRAINT active_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 3666 (class 2606 OID 17011)
-- Name: activity_logs activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- TOC entry 3648 (class 2606 OID 16945)
-- Name: appointments appointments_booked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_booked_by_fkey FOREIGN KEY (booked_by) REFERENCES public.users(user_id);


--
-- TOC entry 3649 (class 2606 OID 16950)
-- Name: appointments appointments_cancelled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.users(user_id);


--
-- TOC entry 3650 (class 2606 OID 16629)
-- Name: appointments appointments_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 3651 (class 2606 OID 16624)
-- Name: appointments appointments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- TOC entry 3652 (class 2606 OID 16940)
-- Name: appointments appointments_specialty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_specialty_id_fkey FOREIGN KEY (specialty_id) REFERENCES public.specialties(specialty_id);


--
-- TOC entry 3662 (class 2606 OID 17421)
-- Name: billing billing_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing
    ADD CONSTRAINT billing_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;


--
-- TOC entry 3663 (class 2606 OID 16710)
-- Name: billing billing_cashier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing
    ADD CONSTRAINT billing_cashier_id_fkey FOREIGN KEY (cashier_id) REFERENCES public.users(user_id);


--
-- TOC entry 3664 (class 2606 OID 16700)
-- Name: billing billing_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing
    ADD CONSTRAINT billing_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- TOC entry 3665 (class 2606 OID 17103)
-- Name: billing billing_voided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing
    ADD CONSTRAINT billing_voided_by_fkey FOREIGN KEY (voided_by) REFERENCES public.users(user_id);


--
-- TOC entry 3681 (class 2606 OID 32825)
-- Name: device_tokens device_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_tokens
    ADD CONSTRAINT device_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 3641 (class 2606 OID 17165)
-- Name: users fk_users_specialty; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_specialty FOREIGN KEY (specialty_id) REFERENCES public.specialties(specialty_id);


--
-- TOC entry 3678 (class 2606 OID 17372)
-- Name: inquiries inquiries_handled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inquiries
    ADD CONSTRAINT inquiries_handled_by_fkey FOREIGN KEY (handled_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- TOC entry 3653 (class 2606 OID 16957)
-- Name: medical_records medical_records_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- TOC entry 3654 (class 2606 OID 16962)
-- Name: medical_records medical_records_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);


--
-- TOC entry 3655 (class 2606 OID 16654)
-- Name: medical_records medical_records_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.users(user_id);


--
-- TOC entry 3656 (class 2606 OID 16649)
-- Name: medical_records medical_records_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- TOC entry 3657 (class 2606 OID 17181)
-- Name: medical_records medical_records_vital_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_vital_id_fkey FOREIGN KEY (vital_id) REFERENCES public.vitals(id) ON DELETE SET NULL;


--
-- TOC entry 3676 (class 2606 OID 17341)
-- Name: medication_logs medication_logs_medication_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medication_logs
    ADD CONSTRAINT medication_logs_medication_id_fkey FOREIGN KEY (medication_id) REFERENCES public.patient_medications(medication_id) ON DELETE CASCADE;


--
-- TOC entry 3677 (class 2606 OID 17346)
-- Name: medication_logs medication_logs_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medication_logs
    ADD CONSTRAINT medication_logs_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- TOC entry 3671 (class 2606 OID 17261)
-- Name: notifications notifications_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;


--
-- TOC entry 3672 (class 2606 OID 17256)
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 3680 (class 2606 OID 24600)
-- Name: password_history password_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_history
    ADD CONSTRAINT password_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 3669 (class 2606 OID 17210)
-- Name: patient_medical_results patient_medical_results_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_medical_results
    ADD CONSTRAINT patient_medical_results_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- TOC entry 3670 (class 2606 OID 17215)
-- Name: patient_medical_results patient_medical_results_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_medical_results
    ADD CONSTRAINT patient_medical_results_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 3673 (class 2606 OID 17382)
-- Name: patient_medications patient_medications_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_medications
    ADD CONSTRAINT patient_medications_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- TOC entry 3674 (class 2606 OID 17311)
-- Name: patient_medications patient_medications_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_medications
    ADD CONSTRAINT patient_medications_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- TOC entry 3675 (class 2606 OID 17306)
-- Name: patient_medications patient_medications_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_medications
    ADD CONSTRAINT patient_medications_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- TOC entry 3679 (class 2606 OID 17405)
-- Name: patient_relatives patient_relatives_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_relatives
    ADD CONSTRAINT patient_relatives_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 3646 (class 2606 OID 16933)
-- Name: patients patients_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);


--
-- TOC entry 3647 (class 2606 OID 16928)
-- Name: patients patients_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- TOC entry 3667 (class 2606 OID 17416)
-- Name: queue_entries queue_entries_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.queue_entries
    ADD CONSTRAINT queue_entries_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE;


--
-- TOC entry 3668 (class 2606 OID 17047)
-- Name: queue_entries queue_entries_specialty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.queue_entries
    ADD CONSTRAINT queue_entries_specialty_id_fkey FOREIGN KEY (specialty_id) REFERENCES public.specialties(specialty_id);


--
-- TOC entry 3644 (class 2606 OID 16451)
-- Name: user_addresses user_addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_addresses
    ADD CONSTRAINT user_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 3642 (class 2606 OID 16429)
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(role_id);


--
-- TOC entry 3643 (class 2606 OID 16919)
-- Name: users users_specialty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_specialty_id_fkey FOREIGN KEY (specialty_id) REFERENCES public.specialties(specialty_id);


--
-- TOC entry 3658 (class 2606 OID 16675)
-- Name: vitals vitals_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vitals
    ADD CONSTRAINT vitals_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- TOC entry 3659 (class 2606 OID 16680)
-- Name: vitals vitals_nurse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vitals
    ADD CONSTRAINT vitals_nurse_id_fkey FOREIGN KEY (nurse_id) REFERENCES public.users(user_id);


--
-- TOC entry 3660 (class 2606 OID 16670)
-- Name: vitals vitals_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vitals
    ADD CONSTRAINT vitals_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- TOC entry 3661 (class 2606 OID 17096)
-- Name: vitals vitals_routed_to_specialty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vitals
    ADD CONSTRAINT vitals_routed_to_specialty_id_fkey FOREIGN KEY (routed_to_specialty_id) REFERENCES public.specialties(specialty_id);


-- Completed on 2026-10-08 01:08:14

--
-- PostgreSQL database dump complete
--

\unrestrict rf4Sl96gCL4Eorvp7TsexmhmQJvbDnpV9aqYao4WRdHA1Q6JHMcR6eSCPdPncqc


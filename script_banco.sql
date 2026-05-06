--
-- PostgreSQL database dump
--

\restrict 06YTOqvK5UHkdfBJuG6dZwdHrVsZrinqvjZMYqx7yXIAydy8sJxS7cgClLbg8UV

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

-- Started on 2026-05-05 21:31:05

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 226 (class 1259 OID 16787)
-- Name: alerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alerts (
    id bigint NOT NULL,
    station_id bigint NOT NULL,
    type character varying(255) NOT NULL,
    severity character varying(255) NOT NULL,
    message character varying(255) NOT NULL,
    trigger_value double precision,
    limit_value double precision,
    acknowledged boolean DEFAULT false NOT NULL,
    acknowledged_at timestamp without time zone,
    triggered_at timestamp without time zone NOT NULL,
    CONSTRAINT alerts_severity_check CHECK (((severity)::text = ANY (ARRAY[('LOW'::character varying)::text, ('MEDIUM'::character varying)::text, ('HIGH'::character varying)::text, ('CRITICAL'::character varying)::text]))),
    CONSTRAINT alerts_type_check CHECK (((type)::text = ANY (ARRAY[('CO2_HIGH'::character varying)::text, ('PM_HIGH'::character varying)::text, ('SENSOR_OFFLINE'::character varying)::text, ('SYSTEM'::character varying)::text])))
);


ALTER TABLE public.alerts OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16786)
-- Name: alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.alerts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.alerts_id_seq OWNER TO postgres;

--
-- TOC entry 4985 (class 0 OID 0)
-- Dependencies: 225
-- Name: alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.alerts_id_seq OWNED BY public.alerts.id;


--
-- TOC entry 228 (class 1259 OID 16812)
-- Name: carbon_credits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.carbon_credits (
    id bigint NOT NULL,
    station_id bigint,
    credits_calculated double precision NOT NULL,
    period_reference character varying(255),
    description character varying(255),
    calculated_at timestamp without time zone,
    validated boolean DEFAULT false NOT NULL
);


ALTER TABLE public.carbon_credits OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 16811)
-- Name: carbon_credits_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.carbon_credits_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.carbon_credits_id_seq OWNER TO postgres;

--
-- TOC entry 4986 (class 0 OID 0)
-- Dependencies: 227
-- Name: carbon_credits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.carbon_credits_id_seq OWNED BY public.carbon_credits.id;


--
-- TOC entry 230 (class 1259 OID 16830)
-- Name: conformity_parameters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conformity_parameters (
    id bigint NOT NULL,
    parameter_name character varying(255) NOT NULL,
    max_co2_level double precision,
    max_pm_level double precision,
    legal_reference character varying(255),
    description character varying(255),
    active boolean DEFAULT true NOT NULL,
    max_co2level double precision
);


ALTER TABLE public.conformity_parameters OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 16829)
-- Name: conformity_parameters_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.conformity_parameters_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.conformity_parameters_id_seq OWNER TO postgres;

--
-- TOC entry 4987 (class 0 OID 0)
-- Dependencies: 229
-- Name: conformity_parameters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.conformity_parameters_id_seq OWNED BY public.conformity_parameters.id;


--
-- TOC entry 224 (class 1259 OID 16768)
-- Name: sensor_readings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sensor_readings (
    id bigint NOT NULL,
    station_id bigint NOT NULL,
    co2_level double precision,
    pm_level double precision,
    temperature double precision,
    humidity double precision,
    recorded_at timestamp without time zone NOT NULL,
    source character varying(255) DEFAULT 'MQTT'::character varying NOT NULL,
    co2level double precision,
    CONSTRAINT sensor_readings_source_check CHECK (((source)::text = ANY (ARRAY[('MQTT'::character varying)::text, ('SIMULATED'::character varying)::text, ('MANUAL'::character varying)::text])))
);


ALTER TABLE public.sensor_readings OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16767)
-- Name: sensor_readings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sensor_readings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sensor_readings_id_seq OWNER TO postgres;

--
-- TOC entry 4988 (class 0 OID 0)
-- Dependencies: 223
-- Name: sensor_readings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sensor_readings_id_seq OWNED BY public.sensor_readings.id;


--
-- TOC entry 222 (class 1259 OID 16751)
-- Name: stations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stations (
    id bigint NOT NULL,
    station_code character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    location character varying(255),
    status character varying(255) DEFAULT 'OFFLINE'::character varying NOT NULL,
    latitude double precision,
    longitude double precision,
    last_seen timestamp without time zone,
    CONSTRAINT stations_status_check CHECK (((status)::text = ANY (ARRAY[('ONLINE'::character varying)::text, ('OFFLINE'::character varying)::text, ('MAINTENANCE'::character varying)::text])))
);


ALTER TABLE public.stations OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16750)
-- Name: stations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stations_id_seq OWNER TO postgres;

--
-- TOC entry 4989 (class 0 OID 0)
-- Dependencies: 221
-- Name: stations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stations_id_seq OWNED BY public.stations.id;


--
-- TOC entry 220 (class 1259 OID 16730)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    username character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    email character varying(255),
    full_name character varying(255),
    role character varying(255) DEFAULT 'OPERATOR'::character varying NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY (ARRAY[('ADMIN'::character varying)::text, ('OPERATOR'::character varying)::text, ('VIEWER'::character varying)::text])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16729)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 4990 (class 0 OID 0)
-- Dependencies: 219
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 4787 (class 2604 OID 16790)
-- Name: alerts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alerts ALTER COLUMN id SET DEFAULT nextval('public.alerts_id_seq'::regclass);


--
-- TOC entry 4789 (class 2604 OID 16815)
-- Name: carbon_credits id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carbon_credits ALTER COLUMN id SET DEFAULT nextval('public.carbon_credits_id_seq'::regclass);


--
-- TOC entry 4791 (class 2604 OID 16833)
-- Name: conformity_parameters id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conformity_parameters ALTER COLUMN id SET DEFAULT nextval('public.conformity_parameters_id_seq'::regclass);


--
-- TOC entry 4785 (class 2604 OID 16771)
-- Name: sensor_readings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensor_readings ALTER COLUMN id SET DEFAULT nextval('public.sensor_readings_id_seq'::regclass);


--
-- TOC entry 4783 (class 2604 OID 16754)
-- Name: stations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stations ALTER COLUMN id SET DEFAULT nextval('public.stations_id_seq'::regclass);


--
-- TOC entry 4780 (class 2604 OID 16733)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 4975 (class 0 OID 16787)
-- Dependencies: 226
-- Data for Name: alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.alerts (id, station_id, type, severity, message, trigger_value, limit_value, acknowledged, acknowledged_at, triggered_at) FROM stdin;
\.


--
-- TOC entry 4977 (class 0 OID 16812)
-- Dependencies: 228
-- Data for Name: carbon_credits; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.carbon_credits (id, station_id, credits_calculated, period_reference, description, calculated_at, validated) FROM stdin;
\.


--
-- TOC entry 4979 (class 0 OID 16830)
-- Dependencies: 230
-- Data for Name: conformity_parameters; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.conformity_parameters (id, parameter_name, max_co2_level, max_pm_level, legal_reference, description, active, max_co2level) FROM stdin;
1	CONAMA 03/1990	1000	150	Resolução CONAMA nº 03, de 28 de junho de 1990	Padrões nacionais de qualidade do ar — padrões primários	t	\N
\.


--
-- TOC entry 4973 (class 0 OID 16768)
-- Dependencies: 224
-- Data for Name: sensor_readings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sensor_readings (id, station_id, co2_level, pm_level, temperature, humidity, recorded_at, source, co2level) FROM stdin;
1	1	\N	26.260146505253662	26.242245247122774	54.73296553986064	2026-05-04 19:53:45.262282	SIMULATED	772.0056643283781
2	1	\N	20.78654836004269	25.635735720639783	58.437957605674555	2026-05-04 20:53:45.262282	SIMULATED	644.188685127087
3	1	\N	25.913193928270026	24.90043529713335	52.47402836353403	2026-05-04 21:53:45.262282	SIMULATED	651.5392278236325
4	1	\N	31.23941571894971	20.754630884175064	56.80374021875088	2026-05-04 22:53:45.262282	SIMULATED	449.0198077466494
5	1	\N	43.6212988125466	25.504795615354205	78.48588226497763	2026-05-04 23:53:45.262282	SIMULATED	419.6005580592774
6	1	\N	46.843401131907726	23.967278081889226	61.210482790148255	2026-05-05 00:53:45.262282	SIMULATED	603.1849788839486
7	1	\N	45.42769980292688	22.287432200182735	64.86628630009713	2026-05-05 01:53:45.262282	SIMULATED	782.5796733286575
8	1	\N	40.764260454982235	25.895261614378814	51.54295801956107	2026-05-05 02:53:45.262282	SIMULATED	789.3129632901764
9	1	\N	21.91807291498434	24.78391947303821	77.75898250978948	2026-05-05 03:53:45.262282	SIMULATED	523.7483447116533
10	1	\N	33.573896819136074	23.05716840215421	57.03238041149331	2026-05-05 04:53:45.262282	SIMULATED	528.0792822042011
11	1	\N	49.62589735171835	26.264173377424484	72.17504007216104	2026-05-05 05:53:45.262282	SIMULATED	607.4321427067948
12	1	\N	22.901266952879826	24.424764526390952	72.89263464274526	2026-05-05 06:53:45.262282	SIMULATED	763.4452298419178
13	1	\N	29.426950686652365	20.845573030178766	61.410766107062685	2026-05-05 07:53:45.262282	SIMULATED	786.3320272796659
14	1	\N	49.506016555886646	26.83720558266602	56.9241545786506	2026-05-05 08:53:45.262282	SIMULATED	645.57759544325
15	1	\N	37.66513292215694	20.264897842285965	78.6793530536463	2026-05-05 09:53:45.262282	SIMULATED	526.0578104531951
16	1	\N	49.26703691219846	21.499839364528942	77.45264459583701	2026-05-05 10:53:45.262282	SIMULATED	575.5114594904668
17	1	\N	43.251800268115616	23.785640060345063	66.07346305177451	2026-05-05 11:53:45.262282	SIMULATED	560.9360366322572
18	1	\N	48.07812163236434	26.29416837170703	61.46982156999728	2026-05-05 12:53:45.262282	SIMULATED	675.6187620271512
19	1	\N	31.480793621124114	27.217255101212785	73.47593422365509	2026-05-05 13:53:45.262282	SIMULATED	695.1547438986288
20	1	\N	34.14291683072515	21.125530287265505	69.34337522141426	2026-05-05 14:53:45.262282	SIMULATED	749.9449967903198
21	1	\N	22.801357117973087	29.52291387774199	77.53578671127245	2026-05-05 15:53:45.262282	SIMULATED	763.3076961722081
22	1	\N	49.66135368546907	26.035061459830345	79.9633294235576	2026-05-05 16:53:45.262282	SIMULATED	698.4764876862188
23	1	\N	22.291128837878375	27.9923176254949	58.32673460014257	2026-05-05 17:53:45.262282	SIMULATED	564.400492850129
24	1	\N	31.399742606074845	24.302505036967382	77.69199032107252	2026-05-05 18:53:45.262282	SIMULATED	449.40102153504307
\.


--
-- TOC entry 4971 (class 0 OID 16751)
-- Dependencies: 222
-- Data for Name: stations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stations (id, station_code, name, location, status, latitude, longitude, last_seen) FROM stdin;
1	ST-001	Estação Norte	Setor Norte - Facens	ONLINE	-23.5	-47.45	2026-05-05 18:53:45.219306
\.


--
-- TOC entry 4969 (class 0 OID 16730)
-- Dependencies: 220
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password, email, full_name, role, enabled) FROM stdin;
2	admin	$2a$10$DuwcJzzQ8LM1jkrvbeg20O8mel3TuBdoWzCkSIMD428RtdJgICXkq	admin@carbontree.com	Administrador	ADMIN	t
\.


--
-- TOC entry 4991 (class 0 OID 0)
-- Dependencies: 225
-- Name: alerts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.alerts_id_seq', 1, false);


--
-- TOC entry 4992 (class 0 OID 0)
-- Dependencies: 227
-- Name: carbon_credits_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.carbon_credits_id_seq', 1, false);


--
-- TOC entry 4993 (class 0 OID 0)
-- Dependencies: 229
-- Name: conformity_parameters_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.conformity_parameters_id_seq', 1, true);


--
-- TOC entry 4994 (class 0 OID 0)
-- Dependencies: 223
-- Name: sensor_readings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sensor_readings_id_seq', 24, true);


--
-- TOC entry 4995 (class 0 OID 0)
-- Dependencies: 221
-- Name: stations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stations_id_seq', 1, true);


--
-- TOC entry 4996 (class 0 OID 0)
-- Dependencies: 219
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 2, true);


--
-- TOC entry 4812 (class 2606 OID 16804)
-- Name: alerts alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (id);


--
-- TOC entry 4815 (class 2606 OID 16823)
-- Name: carbon_credits carbon_credits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carbon_credits
    ADD CONSTRAINT carbon_credits_pkey PRIMARY KEY (id);


--
-- TOC entry 4817 (class 2606 OID 16841)
-- Name: conformity_parameters conformity_parameters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conformity_parameters
    ADD CONSTRAINT conformity_parameters_pkey PRIMARY KEY (id);


--
-- TOC entry 4810 (class 2606 OID 16779)
-- Name: sensor_readings sensor_readings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensor_readings
    ADD CONSTRAINT sensor_readings_pkey PRIMARY KEY (id);


--
-- TOC entry 4805 (class 2606 OID 16764)
-- Name: stations stations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stations
    ADD CONSTRAINT stations_pkey PRIMARY KEY (id);


--
-- TOC entry 4807 (class 2606 OID 16886)
-- Name: stations stations_station_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stations
    ADD CONSTRAINT stations_station_code_key UNIQUE (station_code);


--
-- TOC entry 4799 (class 2606 OID 16892)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4801 (class 2606 OID 16745)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4803 (class 2606 OID 16897)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- TOC entry 4813 (class 1259 OID 16810)
-- Name: idx_alerts_station_ack; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_alerts_station_ack ON public.alerts USING btree (station_id, acknowledged, triggered_at DESC);


--
-- TOC entry 4808 (class 1259 OID 16785)
-- Name: idx_sensor_readings_station_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sensor_readings_station_time ON public.sensor_readings USING btree (station_id, recorded_at DESC);


--
-- TOC entry 4819 (class 2606 OID 16805)
-- Name: alerts alerts_station_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations(id) ON DELETE CASCADE;


--
-- TOC entry 4820 (class 2606 OID 16824)
-- Name: carbon_credits carbon_credits_station_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carbon_credits
    ADD CONSTRAINT carbon_credits_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations(id) ON DELETE SET NULL;


--
-- TOC entry 4818 (class 2606 OID 16780)
-- Name: sensor_readings sensor_readings_station_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensor_readings
    ADD CONSTRAINT sensor_readings_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations(id) ON DELETE CASCADE;


-- Completed on 2026-05-05 21:31:06

--
-- PostgreSQL database dump complete
--

\unrestrict 06YTOqvK5UHkdfBJuG6dZwdHrVsZrinqvjZMYqx7yXIAydy8sJxS7cgClLbg8UV


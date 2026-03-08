--
-- PostgreSQL database dump
--

\restrict gSqUFss0vXh5VqKH3j6deRUqxu3YqFw2Ki1GBN5gpwCPTmuLHjE3r0MKVTvCvXF

-- Dumped from database version 15.17 (Debian 15.17-1.pgdg13+1)
-- Dumped by pg_dump version 15.17 (Debian 15.17-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA drizzle;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: -
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: -
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: -
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: notificationSettings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."notificationSettings" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "isEnabled" boolean DEFAULT true NOT NULL,
    "reminderTime" character varying(5) NOT NULL,
    "reminderDays" character varying(255) NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: notificationSettings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."notificationSettings_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notificationSettings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."notificationSettings_id_seq" OWNED BY public."notificationSettings".id;


--
-- Name: notificationSettings_userId_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."notificationSettings_userId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notificationSettings_userId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."notificationSettings_userId_seq" OWNED BY public."notificationSettings"."userId";


--
-- Name: pushSubscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."pushSubscriptions" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: pushSubscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."pushSubscriptions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pushSubscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."pushSubscriptions_id_seq" OWNED BY public."pushSubscriptions".id;


--
-- Name: serviceTypes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."serviceTypes" (
    id integer NOT NULL,
    "shopId" integer NOT NULL,
    name character varying(255) NOT NULL,
    "hourlyPay" numeric(10,2) NOT NULL,
    description text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "workerId" integer NOT NULL
);


--
-- Name: serviceTypes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."serviceTypes_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: serviceTypes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."serviceTypes_id_seq" OWNED BY public."serviceTypes".id;


--
-- Name: serviceTypes_shopId_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."serviceTypes_shopId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: serviceTypes_shopId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."serviceTypes_shopId_seq" OWNED BY public."serviceTypes"."shopId";


--
-- Name: shops; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shops (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "workerId" integer NOT NULL,
    "payType" character varying(32) DEFAULT 'hourly'::character varying NOT NULL,
    "shopCommissionRate" numeric(5,4),
    "settlementType" character varying(32),
    "settlementDates" character varying(64),
    "settlementAnchorDate" date,
    "settlementCycleDays" integer
);


--
-- Name: shops_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.shops_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: shops_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.shops_id_seq OWNED BY public.shops.id;


--
-- Name: shops_userId_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."shops_userId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: shops_userId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."shops_userId_seq" OWNED BY public.shops."userId";


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    "openId" character varying(64) NOT NULL,
    name text,
    email character varying(320),
    "loginMethod" character varying(64),
    role text DEFAULT 'user'::text NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "lastSignedIn" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: workRecordLineItems; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."workRecordLineItems" (
    id integer NOT NULL,
    "workRecordId" integer NOT NULL,
    "serviceTypeId" integer NOT NULL,
    hours numeric(10,2) NOT NULL,
    "hourlyPay" numeric(10,2) NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: workRecordLineItems_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."workRecordLineItems_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workRecordLineItems_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."workRecordLineItems_id_seq" OWNED BY public."workRecordLineItems".id;


--
-- Name: workRecords; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."workRecords" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "shopId" integer NOT NULL,
    "serviceTypeId" integer,
    "workDate" date NOT NULL,
    hours numeric(10,2),
    "hourlyPay" numeric(10,2),
    "totalEarnings" numeric(10,2) NOT NULL,
    notes text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "workerId" integer NOT NULL,
    "serviceAmount" numeric(10,2),
    "shopCommissionAmount" numeric(10,2),
    "cashTips" numeric(10,2) DEFAULT 0 NOT NULL,
    "cardTips" numeric(10,2) DEFAULT 0 NOT NULL
);


--
-- Name: workRecords_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."workRecords_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workRecords_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."workRecords_id_seq" OWNED BY public."workRecords".id;


--
-- Name: workRecords_serviceTypeId_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."workRecords_serviceTypeId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workRecords_serviceTypeId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."workRecords_serviceTypeId_seq" OWNED BY public."workRecords"."serviceTypeId";


--
-- Name: workRecords_shopId_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."workRecords_shopId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workRecords_shopId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."workRecords_shopId_seq" OWNED BY public."workRecords"."shopId";


--
-- Name: workRecords_userId_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."workRecords_userId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workRecords_userId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."workRecords_userId_seq" OWNED BY public."workRecords"."userId";


--
-- Name: workers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workers (
    id integer NOT NULL,
    "ownerUserId" integer NOT NULL,
    name character varying(255) NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: workers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.workers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.workers_id_seq OWNED BY public.workers.id;


--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Name: notificationSettings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."notificationSettings" ALTER COLUMN id SET DEFAULT nextval('public."notificationSettings_id_seq"'::regclass);


--
-- Name: notificationSettings userId; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."notificationSettings" ALTER COLUMN "userId" SET DEFAULT nextval('public."notificationSettings_userId_seq"'::regclass);


--
-- Name: pushSubscriptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."pushSubscriptions" ALTER COLUMN id SET DEFAULT nextval('public."pushSubscriptions_id_seq"'::regclass);


--
-- Name: serviceTypes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."serviceTypes" ALTER COLUMN id SET DEFAULT nextval('public."serviceTypes_id_seq"'::regclass);


--
-- Name: serviceTypes shopId; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."serviceTypes" ALTER COLUMN "shopId" SET DEFAULT nextval('public."serviceTypes_shopId_seq"'::regclass);


--
-- Name: shops id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shops ALTER COLUMN id SET DEFAULT nextval('public.shops_id_seq'::regclass);


--
-- Name: shops userId; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shops ALTER COLUMN "userId" SET DEFAULT nextval('public."shops_userId_seq"'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: workRecordLineItems id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."workRecordLineItems" ALTER COLUMN id SET DEFAULT nextval('public."workRecordLineItems_id_seq"'::regclass);


--
-- Name: workRecords id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."workRecords" ALTER COLUMN id SET DEFAULT nextval('public."workRecords_id_seq"'::regclass);


--
-- Name: workRecords userId; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."workRecords" ALTER COLUMN "userId" SET DEFAULT nextval('public."workRecords_userId_seq"'::regclass);


--
-- Name: workRecords shopId; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."workRecords" ALTER COLUMN "shopId" SET DEFAULT nextval('public."workRecords_shopId_seq"'::regclass);


--
-- Name: workRecords serviceTypeId; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."workRecords" ALTER COLUMN "serviceTypeId" SET DEFAULT nextval('public."workRecords_serviceTypeId_seq"'::regclass);


--
-- Name: workers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workers ALTER COLUMN id SET DEFAULT nextval('public.workers_id_seq'::regclass);


--
-- Data for Name: __drizzle_migrations; Type: TABLE DATA; Schema: drizzle; Owner: -
--

COPY drizzle.__drizzle_migrations (id, hash, created_at) FROM stdin;
\.


--
-- Data for Name: notificationSettings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."notificationSettings" (id, "userId", "isEnabled", "reminderTime", "reminderDays", "createdAt", "updatedAt") FROM stdin;
1	1	t	20:30	[0,1,2,3,4,5,6]	2026-03-04 08:00:54.040401	2026-03-04 08:00:54.040401
\.


--
-- Data for Name: pushSubscriptions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."pushSubscriptions" (id, "userId", endpoint, p256dh, auth, "createdAt") FROM stdin;
1	1	https://wns2-bl2p.notify.windows.com/w/?token=BQYAAABX8AO10w1mEVnN6WcKCq2ciGAije1rEtFGh3JIHnbgWbWoLUXwqq6htjNWpHcirW%2fkf8a2ZpFLWlU%2b2f3oyCx3fkEteLGnmduZ%2fD1VDeAiA1Sj33by43UL6Okip0f0bLbmIpu%2fy%2feh5UxUUaj2btg2AbpxFV5AgIQToVNGxtnq1hFsm1VtmUqmG%2b8U%2bfWSsWQT1hkS8eiP4g9LkIosnfxaPPiZdP65Hk0OwUin0I4HKwQ99VkbhRQVvAlk7hHPBHTM3yxwYiOycGOb18xyu%2f7GQk%2bIjzKBCKA3Ohn%2fNJvITgPTOwGvGawJfhX7kGcN%2bIs%3d	BKfUvF9XygO2a_uxUx5RWdaUE0X-ds0b7eX5l2foQsfd1aIX4gpaxS_4mE2AMNv3p0wsdsDVMM38U0vTy2jTCcE	PBXW1YkW1EF9OyNao2d_iw	2026-03-07 03:04:43.807453
2	1	https://wns2-bl2p.notify.windows.com/w/?token=BQYAAADL5wgZlq47J9LOzzeU4Gd8Q0LDTlqyB9%2baIv4x4GRCOxAiilukioL2UQcsWIdP%2fK3WXC5e1SBok%2bCKxMAxs8X5XrzrQPK1s3y3Y6pNd85GGzoeComW7a%2fqbKy05WhG3ytq6AIljv1QC8hrqADu8IEgR2Y0fGyIY%2fVk8bLAw6J7tQjbOZw37HqHs55qM%2bmMuEiaQRqwQwy4TEQ2lHSZPUAosBqtnX1wjc8skZ5nIyhuN9hRcb1BxYrLNQ0C2YXCDKEhGDTmZcPD0P2T4OEe98zgYiCsl9WjG3eAIF0GoxUf2nWjNDrAigAJ3hqn75HNWgl9FGdrSBhNlYDtFCuKVfLZ	BKd8EY7XKBSLqbwU2dzNwcIc69_NQICTR4OU_97NCxQTciuZhxSnaBBXqFts7e7bvuD5xNOhaLuHtGCm_26ZC08	asBqxUfRUX5jspFSycxOdw	2026-03-07 03:07:47.948259
3	1	https://wns2-bl2p.notify.windows.com/w/?token=BQYAAADhW2ylrhKwEByOlBop8VpusU1lPGbjGeZBmNZSiYICKg4LBlcFuG961agWt61hJyHc%2bD%2b5rTuxa%2brk7BzcvT1XCfIHJAgKniqrDw6OZks%2biHjdgfQblZ9ZROLfu3QZzGfhb4rafl24WSUOwwT3HwcxCcP1%2bpnqI8%2brXGo%2fNDx9%2fhgXWoCDuS0KBwG30zCcRNRjrB%2fzNRxb%2f3obJbrYPTSOCv%2fhO6cE7PNcLtRNH8bqnbyuQOiMMyHcPD5uLttfPepQd0K8E6mv5gTXsXWiqnCgtEUSWGoNwIAEsUIW%2fZg42j17QD3%2fAcUVg6qyUWELj%2f7%2fNmTcQIlWc0QtA8ad44PA	BIBgjzSzwk1Z5A1VMTVnT-07H2e3uZGywciUpBtMUHl7oMPFirnqkVADIOA95iUhluCrohBx3hFFR6rjp5kXbtc	fxhxs1uU7ZA7557mM-jmuw	2026-03-07 03:15:09.182166
\.


--
-- Data for Name: serviceTypes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."serviceTypes" (id, "shopId", name, "hourlyPay", description, "isActive", "createdAt", "updatedAt", "workerId") FROM stdin;
9	8	Foot	30.00	\N	t	2026-03-02 06:56:45.390594	2026-03-02 06:56:45.390594	2
8	8	Body	32.00	\N	t	2026-03-02 06:56:39.987979	2026-03-02 06:56:39.987979	2
1	3	Body	30.00	\N	t	2026-03-02 02:25:14.305546	2026-03-02 02:25:14.305546	1
4	6	Body	32.00	\N	t	2026-03-02 06:51:05.849768	2026-03-02 06:51:05.849768	1
5	6	Feet	30.00	\N	t	2026-03-02 06:51:18.513161	2026-03-02 06:51:18.513161	1
6	7	Body	32.00	\N	t	2026-03-02 06:53:00.249755	2026-03-02 06:53:00.249755	1
7	7	foot	30.00	\N	t	2026-03-02 06:53:07.09108	2026-03-02 06:53:07.09108	1
2	4	all	35.00	\N	t	2026-03-02 02:26:23.977227	2026-03-02 02:26:23.977227	2
3	5	all	35.00	\N	t	2026-03-02 03:17:26.454666	2026-03-02 03:17:26.454666	2
12	9	Body	32.00	\N	t	2026-03-02 08:25:46.180614	2026-03-02 08:25:46.180614	2
13	9	Foot	30.00	\N	t	2026-03-02 08:25:52.916536	2026-03-02 08:25:52.916536	2
14	10	All	35.00	\N	t	2026-03-02 08:26:16.867863	2026-03-02 08:26:16.867863	2
15	11	All	35.00	\N	t	2026-03-02 08:26:38.038167	2026-03-02 08:26:38.038167	2
10	4	All	30.00	\N	t	2026-03-02 07:34:21.361762	2026-03-02 07:34:21.361762	1
11	5	All	30.00	\N	t	2026-03-02 08:08:24.850043	2026-03-02 08:08:24.850043	1
16	14	Head Spa	0.00	\N	t	2026-03-03 03:36:28.913951	2026-03-03 03:36:28.913951	2
17	14	Body	0.00	\N	t	2026-03-03 03:36:34.64002	2026-03-03 03:36:34.64002	2
18	14	Foot	0.00	\N	t	2026-03-03 03:36:56.39267	2026-03-03 03:36:56.39267	2
19	14	Pedicure	0.00	\N	t	2026-03-03 03:37:05.941581	2026-03-03 03:37:05.941581	2
20	13	Head Spa	0.00	\N	t	2026-03-03 05:13:36.628332	2026-03-03 05:13:36.628332	1
21	13	Body	0.00	\N	t	2026-03-03 05:13:40.350157	2026-03-03 05:13:40.350157	1
22	13	Foot	0.00	\N	t	2026-03-03 05:13:46.864549	2026-03-03 05:13:46.864549	1
\.


--
-- Data for Name: shops; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.shops (id, "userId", name, description, "isActive", "createdAt", "updatedAt", "workerId", "payType", "shopCommissionRate", "settlementType", "settlementDates", "settlementAnchorDate", "settlementCycleDays") FROM stdin;
14	1	靜境 Bestillhere		t	2026-03-03 03:35:58.015701	2026-03-03 03:35:58.015701	2	commission	0.3000	month_end	\N	\N	\N
11	1	King Feet - Cooney		t	2026-03-02 08:26:29.919379	2026-03-02 08:26:29.919379	2	hourly	\N	cycle	\N	2025-12-27	14
10	1	King Feet - No.3 		t	2026-03-02 08:26:10.641538	2026-03-02 08:26:10.641538	2	hourly	\N	cycle	\N	2025-12-27	14
9	1	Yuen Massage		t	2026-03-02 08:25:38.702896	2026-03-02 08:25:38.702896	2	hourly	\N	fixed_dates	[15,31]	\N	\N
5	1	King Feet - Cooney		t	2026-03-02 03:17:19.620974	2026-03-02 03:17:19.620974	1	hourly	\N	cycle	\N	2025-12-27	14
4	1	King Feet - No.3 		t	2026-03-02 02:25:44.151548	2026-03-02 02:25:44.151548	1	hourly	\N	cycle	\N	2025-12-27	14
13	1	靜境 Bestillhere		t	2026-03-03 02:20:20.184861	2026-03-03 02:20:20.184861	1	commission	0.3000	month_end	\N	\N	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, "openId", name, email, "loginMethod", role, "createdAt", "updatedAt", "lastSignedIn") FROM stdin;
1	dev-local-user	Dev User	dev@local.test	dev	user	2026-03-02 01:35:09.746799	2026-03-02 01:35:09.746799	2026-03-02 01:35:09.746799
\.


--
-- Data for Name: workRecordLineItems; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."workRecordLineItems" (id, "workRecordId", "serviceTypeId", hours, "hourlyPay", "createdAt", "updatedAt") FROM stdin;
1	41	3	1.00	30.00	2026-03-02 07:01:50.362038	2026-03-02 07:01:50.362038
2	32	2	1.00	30.00	2026-03-02 03:15:09.715097	2026-03-02 03:15:09.715097
3	62	14	4.50	35.00	2026-03-02 08:36:17.36584	2026-03-02 08:36:17.36584
4	7	2	3.50	30.00	2026-03-02 02:43:49.626754	2026-03-02 02:43:49.626754
6	8	2	4.00	30.00	2026-03-02 03:00:11.844145	2026-03-02 03:00:11.844145
7	9	2	1.00	30.00	2026-03-02 03:00:28.509491	2026-03-02 03:00:28.509491
8	10	2	1.00	30.00	2026-03-02 03:00:47.78957	2026-03-02 03:00:47.78957
9	11	2	2.00	30.00	2026-03-02 03:00:59.630509	2026-03-02 03:00:59.630509
10	12	2	2.00	30.00	2026-03-02 03:01:08.650884	2026-03-02 03:01:08.650884
11	13	2	5.00	30.00	2026-03-02 03:02:50.886993	2026-03-02 03:02:50.886993
12	14	2	4.00	30.00	2026-03-02 03:03:18.303223	2026-03-02 03:03:18.303223
13	15	2	1.00	30.00	2026-03-02 03:04:09.801422	2026-03-02 03:04:09.801422
14	16	2	4.50	30.00	2026-03-02 03:04:43.701496	2026-03-02 03:04:43.701496
15	17	2	4.00	30.00	2026-03-02 03:05:02.397895	2026-03-02 03:05:02.397895
16	18	2	3.00	30.00	2026-03-02 03:05:16.79552	2026-03-02 03:05:16.79552
17	19	2	4.50	30.00	2026-03-02 03:05:29.908107	2026-03-02 03:05:29.908107
18	20	2	4.00	30.00	2026-03-02 03:05:53.064093	2026-03-02 03:05:53.064093
19	21	2	4.00	30.00	2026-03-02 03:06:07.209563	2026-03-02 03:06:07.209563
20	22	2	2.00	30.00	2026-03-02 03:06:30.360552	2026-03-02 03:06:30.360552
21	23	2	3.00	30.00	2026-03-02 03:06:43.103519	2026-03-02 03:06:43.103519
22	24	2	2.75	30.00	2026-03-02 03:07:10.027608	2026-03-02 03:07:10.027608
23	25	2	2.00	30.00	2026-03-02 03:07:31.068344	2026-03-02 03:07:31.068344
24	26	2	2.00	30.00	2026-03-02 03:10:36.332693	2026-03-02 03:10:36.332693
25	27	2	2.00	30.00	2026-03-02 03:13:42.535399	2026-03-02 03:13:42.535399
26	28	2	4.00	30.00	2026-03-02 03:13:55.413172	2026-03-02 03:13:55.413172
27	29	2	3.00	30.00	2026-03-02 03:14:14.015016	2026-03-02 03:14:14.015016
28	30	2	4.00	30.00	2026-03-02 03:14:26.63942	2026-03-02 03:14:26.63942
29	31	2	4.00	30.00	2026-03-02 03:14:43.334447	2026-03-02 03:14:43.334447
30	63	14	3.50	35.00	2026-03-02 08:36:31.253782	2026-03-02 08:36:31.253782
31	33	2	3.00	30.00	2026-03-02 03:15:56.157743	2026-03-02 03:15:56.157743
32	34	2	3.00	30.00	2026-03-02 03:16:45.299681	2026-03-02 03:16:45.299681
33	35	3	2.00	30.00	2026-03-02 03:18:25.249531	2026-03-02 03:18:25.249531
35	38	15	1.00	35.00	2026-03-02 06:58:28.966185	2026-03-02 06:58:28.966185
36	39	14	4.00	35.00	2026-03-02 06:59:39.523789	2026-03-02 06:59:39.523789
37	40	15	1.00	35.00	2026-03-02 07:01:25.709217	2026-03-02 07:01:25.709217
39	43	14	3.50	35.00	2026-03-02 07:11:11.562006	2026-03-02 07:11:11.562006
40	44	14	3.50	35.00	2026-03-02 07:12:15.736527	2026-03-02 07:12:15.736527
41	48	15	5.50	35.00	2026-03-02 07:13:34.512695	2026-03-02 07:13:34.512695
42	52	14	4.50	35.00	2026-03-02 07:15:43.297712	2026-03-02 07:15:43.297712
43	51	14	4.00	35.00	2026-03-02 07:14:23.281912	2026-03-02 07:14:23.281912
44	50	14	2.50	35.00	2026-03-02 07:14:12.249644	2026-03-02 07:14:12.249644
45	49	14	2.25	35.00	2026-03-02 07:14:00.022362	2026-03-02 07:14:00.022362
46	47	14	2.50	35.00	2026-03-02 07:13:05.737421	2026-03-02 07:13:05.737421
47	46	14	2.00	35.00	2026-03-02 07:12:51.31309	2026-03-02 07:12:51.31309
48	45	14	2.50	35.00	2026-03-02 07:12:40.118596	2026-03-02 07:12:40.118596
49	53	14	2.00	35.00	2026-03-02 08:33:29.663418	2026-03-02 08:33:29.663418
50	54	14	3.00	35.00	2026-03-02 08:33:51.668317	2026-03-02 08:33:51.668317
51	55	14	3.50	35.00	2026-03-02 08:34:24.113574	2026-03-02 08:34:24.113574
52	56	14	4.50	35.00	2026-03-02 08:34:39.828872	2026-03-02 08:34:39.828872
53	57	14	1.00	35.00	2026-03-02 08:34:50.771293	2026-03-02 08:34:50.771293
54	58	14	3.00	35.00	2026-03-02 08:35:05.846509	2026-03-02 08:35:05.846509
55	59	14	3.00	35.00	2026-03-02 08:35:24.643252	2026-03-02 08:35:24.643252
56	60	14	2.50	35.00	2026-03-02 08:35:36.812209	2026-03-02 08:35:36.812209
57	61	14	3.50	35.00	2026-03-02 08:35:58.695454	2026-03-02 08:35:58.695454
58	64	14	3.50	35.00	2026-03-02 08:36:53.976153	2026-03-02 08:36:53.976153
59	65	14	4.00	35.00	2026-03-02 08:37:05.755209	2026-03-02 08:37:05.755209
60	66	14	4.00	35.00	2026-03-02 08:37:16.105338	2026-03-02 08:37:16.105338
61	67	14	5.50	35.00	2026-03-02 08:37:29.952435	2026-03-02 08:37:29.952435
62	68	14	2.00	35.00	2026-03-02 08:37:44.585854	2026-03-02 08:37:44.585854
63	69	14	1.50	35.00	2026-03-02 08:38:02.268406	2026-03-02 08:38:02.268406
64	70	14	4.00	35.00	2026-03-02 08:38:18.879679	2026-03-02 08:38:18.879679
65	71	14	3.50	35.00	2026-03-02 08:38:30.545592	2026-03-02 08:38:30.545592
66	36	12	2.00	32.00	2026-03-03 05:00:36.410596	2026-03-03 05:00:36.410596
67	36	13	1.00	30.00	2026-03-03 05:00:36.414567	2026-03-03 05:00:36.414567
68	80	13	1.00	30.00	2026-03-03 05:01:32.643825	2026-03-03 05:01:32.643825
69	80	12	7.00	32.00	2026-03-03 05:01:32.64892	2026-03-03 05:01:32.64892
73	82	13	1.00	30.00	2026-03-03 05:03:21.118388	2026-03-03 05:03:21.118388
74	81	13	3.00	30.00	2026-03-03 05:03:26.755129	2026-03-03 05:03:26.755129
75	81	12	3.50	32.00	2026-03-03 05:03:26.757415	2026-03-03 05:03:26.757415
77	83	12	6.00	32.00	2026-03-03 05:04:19.637739	2026-03-03 05:04:19.637739
78	84	13	2.00	30.00	2026-03-03 05:04:52.25446	2026-03-03 05:04:52.25446
79	84	12	1.50	32.00	2026-03-03 05:04:52.261892	2026-03-03 05:04:52.261892
80	85	13	2.50	30.00	2026-03-03 05:05:23.097877	2026-03-03 05:05:23.097877
81	85	12	2.00	32.00	2026-03-03 05:05:23.102901	2026-03-03 05:05:23.102901
84	86	13	2.50	30.00	2026-03-03 05:06:05.119993	2026-03-03 05:06:05.119993
85	86	12	4.00	32.00	2026-03-03 05:06:05.123064	2026-03-03 05:06:05.123064
86	87	13	3.00	30.00	2026-03-03 05:06:31.339418	2026-03-03 05:06:31.339418
87	87	12	3.50	32.00	2026-03-03 05:06:31.343207	2026-03-03 05:06:31.343207
88	88	13	1.00	30.00	2026-03-03 05:06:51.66897	2026-03-03 05:06:51.66897
89	88	12	1.50	32.00	2026-03-03 05:06:51.672408	2026-03-03 05:06:51.672408
90	89	13	1.50	30.00	2026-03-03 05:07:29.347711	2026-03-03 05:07:29.347711
91	89	12	6.00	32.00	2026-03-03 05:07:29.350501	2026-03-03 05:07:29.350501
92	90	13	3.00	30.00	2026-03-03 05:07:58.15695	2026-03-03 05:07:58.15695
93	90	12	2.00	32.00	2026-03-03 05:07:58.177737	2026-03-03 05:07:58.177737
94	91	13	2.00	30.00	2026-03-03 05:08:22.934696	2026-03-03 05:08:22.934696
95	91	12	2.50	32.00	2026-03-03 05:08:22.937494	2026-03-03 05:08:22.937494
96	92	13	1.50	30.00	2026-03-03 05:08:51.410456	2026-03-03 05:08:51.410456
97	92	12	5.00	32.00	2026-03-03 05:08:51.413247	2026-03-03 05:08:51.413247
98	93	13	2.00	30.00	2026-03-03 05:09:14.58752	2026-03-03 05:09:14.58752
99	93	12	3.50	32.00	2026-03-03 05:09:14.5909	2026-03-03 05:09:14.5909
100	94	13	3.00	30.00	2026-03-03 05:09:38.779244	2026-03-03 05:09:38.779244
101	94	12	6.00	32.00	2026-03-03 05:09:38.781558	2026-03-03 05:09:38.781558
102	95	13	3.50	30.00	2026-03-03 05:10:15.088791	2026-03-03 05:10:15.088791
103	95	12	3.50	32.00	2026-03-03 05:10:15.091518	2026-03-03 05:10:15.091518
105	96	13	3.50	30.00	2026-03-03 05:10:47.193654	2026-03-03 05:10:47.193654
106	97	13	1.00	30.00	2026-03-03 05:11:12.032941	2026-03-03 05:11:12.032941
107	97	12	1.50	32.00	2026-03-03 05:11:12.035964	2026-03-03 05:11:12.035964
108	104	15	1.00	35.00	2026-03-04 05:39:20.073796	2026-03-04 05:39:20.073796
109	105	14	2.00	35.00	2026-03-04 05:39:47.399652	2026-03-04 05:39:47.399652
110	106	10	1.00	30.00	2026-03-04 05:40:15.049311	2026-03-04 05:40:15.049311
111	107	11	1.00	30.00	2026-03-04 05:40:33.647655	2026-03-04 05:40:33.647655
113	42	14	3.00	35.00	2026-03-04 07:17:52.861248	2026-03-04 07:17:52.861248
114	108	14	2.25	35.00	2026-03-04 07:18:31.672125	2026-03-04 07:18:31.672125
115	109	12	0.50	32.00	2026-03-05 07:03:12.924653	2026-03-05 07:03:12.924653
116	110	14	1.50	35.00	2026-03-05 07:03:39.076359	2026-03-05 07:03:39.076359
117	112	12	2.00	32.00	2026-03-06 11:37:51.61444	2026-03-06 11:37:51.61444
118	112	13	1.00	30.00	2026-03-06 11:37:51.620216	2026-03-06 11:37:51.620216
151	146	14	3.00	35.00	2026-03-07 06:55:25.49184	2026-03-07 06:55:25.49184
152	145	10	3.00	30.00	2026-03-07 06:58:19.447237	2026-03-07 06:58:19.447237
\.


--
-- Data for Name: workRecords; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."workRecords" (id, "userId", "shopId", "serviceTypeId", "workDate", hours, "hourlyPay", "totalEarnings", notes, "createdAt", "updatedAt", "workerId", "serviceAmount", "shopCommissionAmount", "cashTips", "cardTips") FROM stdin;
80	1	9	\N	2026-01-01	\N	\N	374.10		2026-03-03 05:01:32.637771	2026-03-03 05:01:32.637771	2	\N	\N	70.00	50.10
82	1	9	\N	2026-01-07	\N	\N	42.50		2026-03-03 05:03:21.113622	2026-03-03 05:03:21.113622	2	\N	\N	12.50	0.00
84	1	9	\N	2026-01-11	\N	\N	161.93		2026-03-03 05:04:52.243214	2026-03-03 05:04:52.243214	2	\N	\N	23.93	30.00
86	1	9	\N	2026-01-15	\N	\N	306.95		2026-03-03 05:05:46.923676	2026-03-03 05:05:46.923676	2	\N	\N	90.00	13.95
87	1	9	\N	2026-01-18	\N	\N	279.02		2026-03-03 05:06:31.334195	2026-03-03 05:06:31.334195	2	\N	\N	65.60	11.42
88	1	9	\N	2026-01-21	\N	\N	103.00		2026-03-03 05:06:51.664602	2026-03-03 05:06:51.664602	2	\N	\N	25.00	0.00
89	1	9	\N	2026-01-22	\N	\N	345.72		2026-03-03 05:07:29.343334	2026-03-03 05:07:29.343334	2	\N	\N	105.00	3.72
90	1	9	\N	2026-01-25	\N	\N	218.27		2026-03-03 05:07:58.15238	2026-03-03 05:07:58.15238	2	\N	\N	30.00	34.27
91	1	9	\N	2026-01-28	\N	\N	217.49		2026-03-03 05:08:22.92952	2026-03-03 05:08:22.92952	2	\N	\N	65.00	12.49
92	1	9	\N	2026-01-29	\N	\N	296.48		2026-03-03 05:08:51.403653	2026-03-03 05:08:51.403653	2	\N	\N	70.00	21.48
93	1	9	\N	2026-02-05	\N	\N	245.00		2026-03-03 05:09:14.582495	2026-03-03 05:09:14.582495	2	\N	\N	60.00	13.00
94	1	9	\N	2026-02-08	\N	\N	354.50		2026-03-03 05:09:38.775009	2026-03-03 05:09:38.775009	2	\N	\N	72.50	0.00
95	1	9	\N	2026-02-19	\N	\N	286.60		2026-03-03 05:10:15.084972	2026-03-03 05:10:15.084972	2	\N	\N	51.00	18.60
96	1	9	\N	2026-02-25	\N	\N	105.00		2026-03-03 05:10:35.751371	2026-03-03 05:10:35.751371	2	\N	\N	0.00	0.00
97	1	9	\N	2026-02-26	\N	\N	78.00		2026-03-03 05:11:12.028624	2026-03-03 05:11:12.028624	2	\N	\N	0.00	0.00
98	1	13	20	2025-12-24	1.00	\N	54.60		2026-03-03 05:14:38.762482	2026-03-03 05:14:38.762482	1	68.00	20.40	7.00	0.00
99	1	13	20	2025-12-25	1.00	\N	54.60		2026-03-03 05:15:07.190499	2026-03-03 05:15:07.190499	1	68.00	20.40	7.00	0.00
100	1	13	20	2025-12-29	1.00	\N	49.60		2026-03-03 05:15:51.354842	2026-03-03 05:15:51.354842	1	68.00	20.40	2.00	0.00
101	1	13	20	2026-01-06	1.00	\N	49.60		2026-03-03 05:16:26.447737	2026-03-03 05:16:26.447737	1	68.00	20.40	2.00	0.00
102	1	13	20	2026-01-15	1.00	\N	47.60		2026-03-03 05:16:52.071004	2026-03-03 05:16:52.071004	1	68.00	20.40	0.00	0.00
103	1	13	20	2026-02-19	1.00	\N	56.60		2026-03-03 05:17:15.820242	2026-03-03 05:17:15.820242	1	78.00	23.40	2.00	0.00
104	1	11	\N	2026-03-03	\N	\N	45.00		2026-03-04 05:39:20.064814	2026-03-04 05:39:20.064814	2	\N	\N	10.00	0.00
105	1	10	\N	2026-03-03	\N	\N	100.00		2026-03-04 05:39:47.396551	2026-03-04 05:39:47.396551	2	\N	\N	30.00	0.00
106	1	4	\N	2026-03-03	\N	\N	40.00		2026-03-04 05:40:15.044619	2026-03-04 05:40:15.044619	1	\N	\N	10.00	0.00
107	1	5	\N	2026-03-03	\N	\N	40.00		2026-03-04 05:40:33.641605	2026-03-04 05:40:33.641605	1	\N	\N	10.00	0.00
42	1	10	\N	2026-02-24	\N	\N	139.00		2026-03-02 07:05:36.93124	2026-03-02 07:05:36.93124	2	\N	\N	34.00	0.00
108	1	10	\N	2026-02-27	\N	\N	105.75		2026-03-04 07:18:31.668245	2026-03-04 07:18:31.668245	2	\N	\N	27.00	0.00
109	1	9	\N	2026-03-04	\N	\N	16.00		2026-03-05 07:03:12.912309	2026-03-05 07:03:12.912309	2	\N	\N	0.00	0.00
110	1	10	\N	2026-03-04	\N	\N	92.50		2026-03-05 07:03:39.07211	2026-03-05 07:03:39.07211	2	\N	\N	40.00	0.00
111	1	14	17	2026-03-04	3.00	\N	168.00		2026-03-05 07:04:15.595984	2026-03-05 07:04:15.595984	2	240.00	72.00	0.00	0.00
112	1	9	\N	2026-03-05	\N	\N	124.00		2026-03-06 11:37:51.602401	2026-03-06 11:37:51.602401	2	\N	\N	30.00	0.00
113	1	14	17	2026-03-05	1.50	\N	52.50		2026-03-06 11:38:14.553972	2026-03-06 11:38:14.553972	2	75.00	22.50	0.00	0.00
146	1	10	\N	2026-03-06	\N	\N	145.00		2026-03-07 06:55:25.481264	2026-03-07 06:55:25.481264	2	\N	\N	40.00	0.00
145	1	4	\N	2026-03-06	\N	\N	120.00		2026-03-07 02:57:13.03682	2026-03-07 02:57:13.03682	1	\N	\N	30.00	0.00
41	1	5	3	2026-02-27	1.00	30.00	40.00		2026-03-02 07:01:50.362038	2026-03-02 07:01:50.362038	1	\N	\N	10.00	0.00
32	1	4	2	2026-02-24	1.00	30.00	40.00		2026-03-02 03:15:09.715097	2026-03-02 03:15:09.715097	1	\N	\N	10.00	0.00
62	1	10	14	2026-01-13	4.50	35.00	208.00		2026-03-02 08:36:17.36584	2026-03-02 08:36:17.36584	2	\N	\N	50.50	0.00
7	1	4	2	2026-01-02	3.50	30.00	146.00		2026-03-02 02:43:49.626754	2026-03-02 02:43:49.626754	1	\N	\N	41.00	0.00
8	1	4	2	2026-01-03	4.00	30.00	164.00		2026-03-02 03:00:11.844145	2026-03-02 03:00:11.844145	1	\N	\N	44.00	0.00
9	1	4	2	2026-01-04	1.00	30.00	40.00		2026-03-02 03:00:28.509491	2026-03-02 03:00:28.509491	1	\N	\N	10.00	0.00
10	1	4	2	2026-01-06	1.00	30.00	60.00		2026-03-02 03:00:47.78957	2026-03-02 03:00:47.78957	1	\N	\N	30.00	0.00
11	1	4	2	2026-01-07	2.00	30.00	80.00		2026-03-02 03:00:59.630509	2026-03-02 03:00:59.630509	1	\N	\N	20.00	0.00
12	1	4	2	2026-01-09	2.00	30.00	84.00		2026-03-02 03:01:08.650884	2026-03-02 03:01:08.650884	1	\N	\N	24.00	0.00
13	1	4	2	2026-01-10	5.00	30.00	230.00		2026-03-02 03:02:50.886993	2026-03-02 03:02:50.886993	1	\N	\N	80.00	0.00
14	1	4	2	2026-01-13	4.00	30.00	184.00		2026-03-02 03:03:18.303223	2026-03-02 03:03:18.303223	1	\N	\N	64.00	0.00
15	1	4	2	2026-01-14	1.00	30.00	40.00		2026-03-02 03:04:09.801422	2026-03-02 03:04:09.801422	1	\N	\N	10.00	0.00
16	1	4	2	2026-01-17	4.50	30.00	185.00		2026-03-02 03:04:43.701496	2026-03-02 03:04:43.701496	1	\N	\N	50.00	0.00
17	1	4	2	2026-01-20	4.00	30.00	170.00		2026-03-02 03:05:02.397895	2026-03-02 03:05:02.397895	1	\N	\N	50.00	0.00
18	1	4	2	2026-01-21	3.00	30.00	125.00		2026-03-02 03:05:16.79552	2026-03-02 03:05:16.79552	1	\N	\N	35.00	0.00
19	1	4	2	2026-01-23	4.50	30.00	190.00		2026-03-02 03:05:29.908107	2026-03-02 03:05:29.908107	1	\N	\N	55.00	0.00
20	1	4	2	2026-01-24	4.00	30.00	170.00		2026-03-02 03:05:53.064093	2026-03-02 03:05:53.064093	1	\N	\N	50.00	0.00
21	1	4	2	2026-01-28	4.00	30.00	165.00		2026-03-02 03:06:07.209563	2026-03-02 03:06:07.209563	1	\N	\N	45.00	0.00
22	1	4	2	2026-01-30	2.00	30.00	80.00		2026-03-02 03:06:30.360552	2026-03-02 03:06:30.360552	1	\N	\N	20.00	0.00
23	1	4	2	2026-01-31	3.00	30.00	120.00		2026-03-02 03:06:43.103519	2026-03-02 03:06:43.103519	1	\N	\N	30.00	0.00
24	1	4	2	2026-02-03	2.75	30.00	112.50		2026-03-02 03:07:10.027608	2026-03-02 03:07:10.027608	1	\N	\N	30.00	0.00
25	1	4	2	2026-02-06	2.00	30.00	80.00		2026-03-02 03:07:31.068344	2026-03-02 03:07:31.068344	1	\N	\N	20.00	0.00
26	1	4	2	2026-02-07	2.00	30.00	80.00		2026-03-02 03:10:36.332693	2026-03-02 03:10:36.332693	1	\N	\N	20.00	0.00
27	1	4	2	2026-02-13	2.00	30.00	95.00		2026-03-02 03:13:42.535399	2026-03-02 03:13:42.535399	1	\N	\N	35.00	0.00
28	1	4	2	2026-02-14	4.00	30.00	165.00		2026-03-02 03:13:55.413172	2026-03-02 03:13:55.413172	1	\N	\N	45.00	0.00
29	1	4	2	2026-02-17	3.00	30.00	130.00		2026-03-02 03:14:14.015016	2026-03-02 03:14:14.015016	1	\N	\N	40.00	0.00
30	1	4	2	2026-02-20	4.00	30.00	196.00		2026-03-02 03:14:26.63942	2026-03-02 03:14:26.63942	1	\N	\N	76.00	0.00
31	1	4	2	2026-02-21	4.00	30.00	162.00		2026-03-02 03:14:43.334447	2026-03-02 03:14:43.334447	1	\N	\N	42.00	0.00
63	1	10	14	2026-01-16	3.50	35.00	157.50		2026-03-02 08:36:31.253782	2026-03-02 08:36:31.253782	2	\N	\N	35.00	0.00
33	1	4	2	2026-02-27	3.00	30.00	117.00		2026-03-02 03:15:56.157743	2026-03-02 03:15:56.157743	1	\N	\N	27.00	0.00
34	1	4	2	2026-02-28	3.00	30.00	125.00		2026-03-02 03:16:45.299681	2026-03-02 03:16:45.299681	1	\N	\N	35.00	0.00
35	1	5	3	2026-02-28	2.00	30.00	91.50		2026-03-02 03:18:25.249531	2026-03-02 03:18:25.249531	1	\N	\N	31.50	0.00
38	1	11	15	2026-02-28	1.00	35.00	51.50		2026-03-02 06:58:28.966185	2026-03-02 06:58:28.966185	2	\N	\N	16.50	0.00
39	1	10	14	2026-02-28	4.00	35.00	180.00		2026-03-02 06:59:39.523789	2026-03-02 06:59:39.523789	2	\N	\N	40.00	0.00
40	1	11	15	2026-02-27	1.00	35.00	45.00		2026-03-02 07:01:25.709217	2026-03-02 07:01:25.709217	2	\N	\N	10.00	0.00
43	1	10	14	2026-02-21	3.50	35.00	157.50		2026-03-02 07:11:11.562006	2026-03-02 07:11:11.562006	2	\N	\N	35.00	0.00
44	1	10	14	2026-02-20	3.50	35.00	157.50		2026-03-02 07:12:15.736527	2026-03-02 07:12:15.736527	2	\N	\N	35.00	0.00
48	1	11	15	2026-02-13	5.50	35.00	192.50		2026-03-02 07:13:34.512695	2026-03-02 07:13:34.512695	2	\N	\N	0.00	0.00
52	1	10	14	2026-02-06	4.50	35.00	207.50		2026-03-02 07:15:43.297712	2026-03-02 07:15:43.297712	2	\N	\N	50.00	0.00
51	1	10	14	2026-02-07	4.00	35.00	190.00		2026-03-02 07:14:23.281912	2026-03-02 07:14:23.281912	2	\N	\N	50.00	0.00
50	1	10	14	2026-02-10	2.50	35.00	87.50		2026-03-02 07:14:12.249644	2026-03-02 07:14:12.249644	2	\N	\N	0.00	0.00
49	1	10	14	2026-02-11	2.25	35.00	78.75		2026-03-02 07:14:00.022362	2026-03-02 07:14:00.022362	2	\N	\N	0.00	0.00
47	1	10	14	2026-02-14	2.50	35.00	102.50		2026-03-02 07:13:05.737421	2026-03-02 07:13:05.737421	2	\N	\N	15.00	0.00
46	1	10	14	2026-02-17	2.00	35.00	100.00		2026-03-02 07:12:51.31309	2026-03-02 07:12:51.31309	2	\N	\N	30.00	0.00
45	1	10	14	2026-02-18	2.50	35.00	117.50		2026-03-02 07:12:40.118596	2026-03-02 07:12:40.118596	2	\N	\N	30.00	0.00
53	1	10	14	2026-02-04	2.00	35.00	90.00		2026-03-02 08:33:29.663418	2026-03-02 08:33:29.663418	2	\N	\N	20.00	0.00
54	1	10	14	2026-02-03	3.00	35.00	135.00		2026-03-02 08:33:51.668317	2026-03-02 08:33:51.668317	2	\N	\N	30.00	0.00
55	1	10	14	2026-01-02	3.50	35.00	167.50		2026-03-02 08:34:24.113574	2026-03-02 08:34:24.113574	2	\N	\N	45.00	0.00
56	1	10	14	2026-01-03	4.50	35.00	212.50		2026-03-02 08:34:39.828872	2026-03-02 08:34:39.828872	2	\N	\N	55.00	0.00
57	1	10	14	2026-01-06	1.00	35.00	45.00		2026-03-02 08:34:50.771293	2026-03-02 08:34:50.771293	2	\N	\N	10.00	0.00
58	1	10	14	2026-01-07	3.00	35.00	160.00		2026-03-02 08:35:05.846509	2026-03-02 08:35:05.846509	2	\N	\N	55.00	0.00
59	1	10	14	2026-01-07	3.00	35.00	160.00		2026-03-02 08:35:24.643252	2026-03-02 08:35:24.643252	2	\N	\N	55.00	0.00
60	1	10	14	2026-01-09	2.50	35.00	112.50		2026-03-02 08:35:36.812209	2026-03-02 08:35:36.812209	2	\N	\N	25.00	0.00
61	1	10	14	2026-01-10	3.50	35.00	212.50		2026-03-02 08:35:58.695454	2026-03-02 08:35:58.695454	2	\N	\N	90.00	0.00
64	1	10	14	2026-01-17	3.50	35.00	142.50		2026-03-02 08:36:53.976153	2026-03-02 08:36:53.976153	2	\N	\N	20.00	0.00
65	1	10	14	2026-01-20	4.00	35.00	210.00		2026-03-02 08:37:05.755209	2026-03-02 08:37:05.755209	2	\N	\N	70.00	0.00
66	1	10	14	2026-01-23	4.00	35.00	200.00		2026-03-02 08:37:16.105338	2026-03-02 08:37:16.105338	2	\N	\N	60.00	0.00
67	1	10	14	2026-01-24	5.50	35.00	247.50		2026-03-02 08:37:29.952435	2026-03-02 08:37:29.952435	2	\N	\N	55.00	0.00
68	1	10	14	2026-01-27	2.00	35.00	90.00		2026-03-02 08:37:44.585854	2026-03-02 08:37:44.585854	2	\N	\N	20.00	0.00
69	1	10	14	2026-01-28	1.50	35.00	92.50		2026-03-02 08:38:02.268406	2026-03-02 08:38:02.268406	2	\N	\N	40.00	0.00
70	1	10	14	2026-01-30	4.00	35.00	180.00		2026-03-02 08:38:18.879679	2026-03-02 08:38:18.879679	2	\N	\N	40.00	0.00
71	1	10	14	2026-01-31	3.50	35.00	157.50		2026-03-02 08:38:30.545592	2026-03-02 08:38:30.545592	2	\N	\N	35.00	0.00
79	1	14	19	2026-03-02	1.00	\N	54.60		2026-03-03 03:42:44.914855	2026-03-03 03:42:44.914855	2	78.00	23.40	0.00	0.00
72	1	14	17	2025-12-29	1.00	\N	72.00		2026-03-03 03:38:41.796701	2026-03-03 03:38:41.796701	2	60.00	18.00	30.00	0.00
76	1	14	17	2026-02-06	2.00	\N	70.00		2026-03-03 03:40:56.427868	2026-03-03 03:40:56.427868	2	100.00	30.00	0.00	0.00
77	1	14	17	2026-02-15	1.00	\N	73.60		2026-03-03 03:41:45.181047	2026-03-03 03:41:45.181047	2	88.00	26.40	12.00	0.00
78	1	14	17	2026-02-17	1.00	\N	28.00		2026-03-03 03:42:06.71058	2026-03-03 03:42:06.71058	2	40.00	12.00	0.00	0.00
74	1	14	17	2026-01-05	2.00	\N	90.00		2026-03-03 03:40:10.520925	2026-03-03 03:40:10.520925	2	100.00	30.00	20.00	0.00
75	1	14	17	2026-01-10	2.00	\N	70.00		2026-03-03 03:40:32.193025	2026-03-03 03:40:32.193025	2	100.00	30.00	0.00	0.00
73	1	14	19	2025-12-29	1.00	\N	47.60		2026-03-03 03:39:43.571056	2026-03-03 03:39:43.571056	2	68.00	20.40	0.00	0.00
36	1	9	\N	2026-03-01	\N	\N	134.00		2026-03-02 06:57:40.989692	2026-03-02 06:57:40.989692	2	\N	\N	40.00	0.00
81	1	9	\N	2026-01-04	\N	\N	312.66		2026-03-03 05:02:14.302465	2026-03-03 05:02:14.302465	2	\N	\N	57.50	53.16
83	1	9	\N	2026-01-08	\N	\N	232.00		2026-03-03 05:03:54.860988	2026-03-03 05:03:54.860988	2	\N	\N	0.00	40.00
85	1	9	\N	2026-01-14	\N	\N	182.70		2026-03-03 05:05:23.09214	2026-03-03 05:05:23.09214	2	\N	\N	30.00	13.70
\.


--
-- Data for Name: workers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.workers (id, "ownerUserId", name, "isActive", "createdAt", "updatedAt") FROM stdin;
2	1	Ryan	t	2026-03-02 06:47:41.172681	2026-03-02 06:47:41.172681
1	1	Cindy	t	2026-03-02 06:46:17.655591	2026-03-02 06:46:17.655591
\.


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE SET; Schema: drizzle; Owner: -
--

SELECT pg_catalog.setval('drizzle.__drizzle_migrations_id_seq', 1, false);


--
-- Name: notificationSettings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."notificationSettings_id_seq"', 1, true);


--
-- Name: notificationSettings_userId_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."notificationSettings_userId_seq"', 1, false);


--
-- Name: pushSubscriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."pushSubscriptions_id_seq"', 3, true);


--
-- Name: serviceTypes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."serviceTypes_id_seq"', 22, true);


--
-- Name: serviceTypes_shopId_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."serviceTypes_shopId_seq"', 1, false);


--
-- Name: shops_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.shops_id_seq', 14, true);


--
-- Name: shops_userId_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."shops_userId_seq"', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 1, true);


--
-- Name: workRecordLineItems_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."workRecordLineItems_id_seq"', 152, true);


--
-- Name: workRecords_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."workRecords_id_seq"', 146, true);


--
-- Name: workRecords_serviceTypeId_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."workRecords_serviceTypeId_seq"', 1, false);


--
-- Name: workRecords_shopId_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."workRecords_shopId_seq"', 1, false);


--
-- Name: workRecords_userId_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."workRecords_userId_seq"', 1, false);


--
-- Name: workers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.workers_id_seq', 2, true);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: notificationSettings notificationSettings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."notificationSettings"
    ADD CONSTRAINT "notificationSettings_pkey" PRIMARY KEY (id);


--
-- Name: notificationSettings notificationSettings_userId_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."notificationSettings"
    ADD CONSTRAINT "notificationSettings_userId_unique" UNIQUE ("userId");


--
-- Name: pushSubscriptions pushSubscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."pushSubscriptions"
    ADD CONSTRAINT "pushSubscriptions_pkey" PRIMARY KEY (id);


--
-- Name: serviceTypes serviceTypes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."serviceTypes"
    ADD CONSTRAINT "serviceTypes_pkey" PRIMARY KEY (id);


--
-- Name: shops shops_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shops
    ADD CONSTRAINT shops_pkey PRIMARY KEY (id);


--
-- Name: users users_openId_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "users_openId_unique" UNIQUE ("openId");


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: workRecordLineItems workRecordLineItems_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."workRecordLineItems"
    ADD CONSTRAINT "workRecordLineItems_pkey" PRIMARY KEY (id);


--
-- Name: workRecords workRecords_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."workRecords"
    ADD CONSTRAINT "workRecords_pkey" PRIMARY KEY (id);


--
-- Name: workers workers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workers
    ADD CONSTRAINT workers_pkey PRIMARY KEY (id);


--
-- Name: pushSubscriptions pushSubscriptions_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."pushSubscriptions"
    ADD CONSTRAINT "pushSubscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: serviceTypes serviceTypes_workerId_workers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."serviceTypes"
    ADD CONSTRAINT "serviceTypes_workerId_workers_id_fk" FOREIGN KEY ("workerId") REFERENCES public.workers(id);


--
-- Name: shops shops_workerId_workers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shops
    ADD CONSTRAINT "shops_workerId_workers_id_fk" FOREIGN KEY ("workerId") REFERENCES public.workers(id);


--
-- Name: workRecordLineItems workRecordLineItems_serviceTypeId_serviceTypes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."workRecordLineItems"
    ADD CONSTRAINT "workRecordLineItems_serviceTypeId_serviceTypes_id_fk" FOREIGN KEY ("serviceTypeId") REFERENCES public."serviceTypes"(id);


--
-- Name: workRecordLineItems workRecordLineItems_workRecordId_workRecords_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."workRecordLineItems"
    ADD CONSTRAINT "workRecordLineItems_workRecordId_workRecords_id_fk" FOREIGN KEY ("workRecordId") REFERENCES public."workRecords"(id) ON DELETE CASCADE;


--
-- Name: workRecords workRecords_workerId_workers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."workRecords"
    ADD CONSTRAINT "workRecords_workerId_workers_id_fk" FOREIGN KEY ("workerId") REFERENCES public.workers(id);


--
-- Name: workers workers_ownerUserId_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workers
    ADD CONSTRAINT "workers_ownerUserId_users_id_fk" FOREIGN KEY ("ownerUserId") REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict gSqUFss0vXh5VqKH3j6deRUqxu3YqFw2Ki1GBN5gpwCPTmuLHjE3r0MKVTvCvXF


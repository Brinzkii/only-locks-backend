CREATE TABLE users (
    username VARCHAR(25) PRIMARY KEY,
    password TEXT NOT NULL,
    wins INTEGER,
    losses INTEGER,
    is_admin BOOLEAN DEFAULT false
);

CREATE TABLE teams (
    id INTEGER PRIMARY KEY,
    code VARCHAR(3) NOT NULL,
    nickname TEXT NOT NULL,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    logo TEXT NOT NULL,
    conference TEXT NOT NULL,
    division TEXT NOT NULL
);

CREATE TABLE players (
    id INTEGER PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    birthday TEXT,
    height TEXT,
    weight TEXT,
    college TEXT,
    number INTEGER,
    position VARCHAR(5),
    team_id INTEGER
        REFERENCES teams ON DELETE CASCADE
);

CREATE TABLE games (
    id INTEGER PRIMARY KEY,
    date DATE NOT NULL,
    location TEXT NOT NULL,
    home_team INTEGER
        REFERENCES teams ON DELETE CASCADE,
    away_team INTEGER
        REFERENCES teams ON DELETE CASCADE,
    clock TEXT,
    score TEXT
);

CREATE TABLE player_picks (
    id SERIAL PRIMARY KEY,
    username TEXT   
        REFERENCES users ON DELETE CASCADE,
    player_id INTEGER 
        REFERENCES players ON DELETE CASCADE,
    game_id INTEGER
        REFERENCES games ON DELETE CASCADE,
    stat TEXT NOT NULL,
    over_under TEXT NOT NULL,
    value INTEGER NOT NULL,
    result BOOLEAN
);

CREATE TABLE team_picks (
    id SERIAL PRIMARY KEY,
    username TEXT   
        REFERENCES users ON DELETE CASCADE,
    team_id INTEGER 
        REFERENCES teams ON DELETE CASCADE,
    game_id INTEGER
        REFERENCES games ON DELETE CASCADE,
    win_spread TEXT NOT NULL,
    value INTEGER,
    result BOOLEAN
);

CREATE TABLE followed_teams (
    id SERIAL PRIMARY KEY,
    username TEXT
        REFERENCES users ON DELETE CASCADE,
    team_id INTEGER 
        REFERENCES teams ON DELETE CASCADE
);

CREATE TABLE followed_players (
    id SERIAL PRIMARY KEY,
    username TEXT
        REFERENCES users ON DELETE CASCADE,
    player_id INTEGER 
        REFERENCES players ON DELETE CASCADE
);

CREATE TABLE team_stats (
    id SERIAL PRIMARY KEY,
    team_id INTEGER
        REFERENCES teams ON DELETE CASCADE,
    games INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    fast_break_points INTEGER NOT NULL,
    points_in_paint INTEGER NOT NULL,
    second_chance_points INTEGER NOT NULL,
    points_off_turnovers INTEGER NOT NULL,
    points INTEGER NOT NULL,
    fgm INTEGER NOT NULL,
    fga INTEGER NOT NULL,
    fgp REAL NOT NULL,
    ftm INTEGER NOT NULL,
    fta INTEGER NOT NULL,
    ftp REAL NOT NULL,
    tpm INTEGER NOT NULL,
    tpa INTEGER NOT NULL,
    tpp REAL NOT NULL,
    off_reb INTEGER NOT NULL,
    def_reb INTEGER NOT NULL,
    total_reb INTEGER NOT NULL,
    assists INTEGER NOT NULL,
    fouls INTEGER NOT NULL,
    steals INTEGER NOT NULL,
    turnovers INTEGER NOT NULL,
    blocks INTEGER NOT NULL,
    plus_minus INTEGER NOT NULL
);

CREATE TABLE season_stats (
    id SERIAL PRIMARY KEY,
    player_id INTEGER 
        REFERENCES players ON DELETE CASCADE,
    minutes INTEGER NOT NULL,
    points INTEGER NOT NULL,
    fgm INTEGER NOT NULL,
    fga INTEGER NOT NULL,
    fgp REAL NOT NULL,
    ftm INTEGER NOT NULL,
    fta INTEGER NOT NULL,
    ftp REAL NOT NULL,
    tpm INTEGER NOT NULL,
    tpa INTEGER NOT NULL,
    tpp REAL NOT NULL,
    off_reb INTEGER NOT NULL,
    def_reb INTEGER NOT NULL,
    total_reb INTEGER NOT NULL,
    assists INTEGER NOT NULL,
    fouls INTEGER NOT NULL,
    steals INTEGER NOT NULL,
    turnovers INTEGER NOT NULL,
    blocks INTEGER NOT NULL,
    plus_minus INTEGER NOT NULL
);

CREATE TABLE game_stats (
    id SERIAL PRIMARY KEY,
    player_id INTEGER 
        REFERENCES players ON DELETE CASCADE,
    game_id INTEGER
        REFERENCES games ON DELETE CASCADE,
    minutes INTEGER NOT NULL,
    points INTEGER NOT NULL,
    fgm INTEGER NOT NULL,
    fga INTEGER NOT NULL,
    fgp REAL NOT NULL,
    ftm INTEGER NOT NULL,
    fta INTEGER NOT NULL,
    ftp REAL NOT NULL,
    tpm INTEGER NOT NULL,
    tpa INTEGER NOT NULL,
    tpp REAL NOT NULL,
    off_reb INTEGER NOT NULL,
    def_reb INTEGER NOT NULL,
    assists INTEGER NOT NULL,
    fouls INTEGER NOT NULL,
    steals INTEGER NOT NULL,
    turnovers INTEGER NOT NULL,
    blocks INTEGER NOT NULL,
    plus_minus INTEGER NOT NULL
);

CREATE TABLE team_game_stats (
    id SERIAL PRIMARY KEY,
    team_id INTEGER
        REFERENCES teams ON DELETE CASCADE,
    game_id INTEGER
        REFERENCES games ON DELETE CASCADE,
    fast_break_points INTEGER NOT NULL,
    points_in_paint INTEGER NOT NULL,
    second_chance_points INTEGER NOT NULL,
    points_off_turnovers INTEGER NOT NULL,
    points INTEGER NOT NULL,
    fgm INTEGER NOT NULL,
    fga INTEGER NOT NULL,
    fgp REAL NOT NULL,
    ftm INTEGER NOT NULL,
    fta INTEGER NOT NULL,
    ftp REAL NOT NULL,
    tpm INTEGER NOT NULL,
    tpa INTEGER NOT NULL,
    tpp REAL NOT NULL,
    off_reb INTEGER NOT NULL,
    def_reb INTEGER NOT NULL,
    total_reb INTEGER NOT NULL,
    assists INTEGER NOT NULL,
    fouls INTEGER NOT NULL,
    steals INTEGER NOT NULL,
    turnovers INTEGER NOT NULL,
    blocks INTEGER NOT NULL,
    plus_minus INTEGER NOT NULL
);

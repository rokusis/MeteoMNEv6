ALTER TABLE stations ADD COLUMN wmo_id TEXT;
-- za hidro cemo koristiti istu tabelu stations, ali dodajemo kolone koje fale za hidro
-- ako vec postoji, nece smetati
ALTER TABLE stations ADD COLUMN flag TEXT;
-- wmo_id vec postoji, flag dodajemo

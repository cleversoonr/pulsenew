## subir front
cd front
npm install
npm run dev
Para conferir que nada quebrou, rode npm run lint.

#
cd front && npm install && npm run dev


## subir back
cd api
python -m venv .venv
source .venv/bin/activate # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m compileall app
uvicorn app.main:app --reload --port 8080

#
cd api && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8080.
# Family Shelf - opis zgłoszenia

Family Shelf to prywatny katalog domowy dla rodziny, służący do ewidencji książek, gier planszowych i gier komputerowych. Aplikacja pomaga sprawdzić, co znajduje się w domu, co zostało komuś pożyczone oraz przechowywać krótkie notatki o pozycjach w katalogu.

Projekt powstał jako MVP dla realnego, rodzinnego przypadku użycia. Użytkownik wybiera profil rodzinny albo tryb gościa. Gość może tylko przeglądać i wyszukiwać katalog, natomiast profil rodzinny może dodawać i edytować pozycje. Usuwanie pozycji wymaga dodatkowego odblokowania uprawnień administratora.

## CRUD i logika aplikacji

Aplikacja obsługuje pełny CRUD dla elementów katalogu:

- dodawanie nowych pozycji,
- przeglądanie i wyszukiwanie katalogu,
- edycję tytułu, statusu wypożyczenia, osoby wypożyczającej i notatki,
- usuwanie pozycji po odblokowaniu trybu admina.

Dodatkowa logika biznesowa obejmuje rozróżnienie profili rodzinnych i gościa, ograniczenie gościa do trybu tylko do odczytu, osobne odblokowanie operacji destrukcyjnych oraz kontrolę uprawnień po stronie API.

## Dokumentacja projektu

W projekcie znajdują się dokumenty kontekstowe:

- `context/foundation/prd.md`,
- `context/foundation/roadmap.md`,
- `context/foundation/test-plan.md`,
- `docs/deployment.md`.

## Testy i automatyczne checki

Projekt zawiera testy i checki wspierające weryfikację działania aplikacji:

- testy E2E w Playwright sprawdzające główne przepływy użytkownika,
- smoke test produkcji,
- contract checks dla profili, katalogu i API,
- lint oraz typecheck,
- GitHub Actions workflow uruchamiający lint i typecheck na pushach i pull requestach do `main`.

## Linki

Repozytorium:
https://github.com/kpodlewski/family-shelf

Wersja produkcyjna:
https://family-shelf-gamma.vercel.app

document.addEventListener('DOMContentLoaded', () => {
    const originStationInput = document.getElementById('origin-station');
    const getTimesButton = document.getElementById('get-times');
    const trainScheduleDiv = document.getElementById('train-schedule');
    const loadingMessageDiv = document.getElementById('loading-message');
    const stationNameTitle = document.getElementById('station-name-title');
    const recentStationsList = document.getElementById('recent-stations-list');
    const recentStationsDiv = document.getElementById('recent-stations');
    const introductionSection = document.getElementById('blabla');

    let recentStations = JSON.parse(localStorage.getItem('recentStations') || '[]');

    const noTrainMessages = [
        "No hay más trenes por ahora.",
        "Te quedaste sin tren papu.",
        "Ya fue, no viene nada.",
        "A mimir en la vereda, no hay mas trenes.",
        "Te dormiste amigo... no hay mas trenes.",
        "Perdiste el último tren, suerte.",
        "F",
        "Anda llamando el uber...",
        "Tenías que salir antes...",
        "La vida es como un tren, a veces se va sin vos."
    ];

    const loadingMessage = [
        "Cargando...",
        "Espere un momento...",
        "Por favor, espere...",
        "Aguanta un cacho..."
    ]

    function getRandomMessage(messages) {
        return messages[Math.floor(Math.random() * messages.length)];
    }
    
    getTimesButton.addEventListener('click', async () => {
        const originStationName = originStationInput.value;

        if (!originStationName) {
            trainScheduleDiv.innerHTML = `<div class="alert alert-warning text-center" role="alert"> Escribí de donde salis papu.</div>`;
            return;
        }
        loadingMessageDiv.innerHTML = getRandomMessage(loadingMessage);
        loadingMessageDiv.style.display = 'block';
        trainScheduleDiv.innerHTML = '';

        try {
            const stationInfo = await getStationId(originStationName);

            if (!stationInfo) {
                loadingMessageDiv.style.display = 'none';
                trainScheduleDiv.innerHTML = `<div class="alert alert-warning text-center" role="alert"> No se encontró la estación.</div>`;
                return;
            }

            stationNameTitle.textContent = stationInfo.name;

            // Update recent stations
            recentStations = recentStations.filter(station => station.id !== stationInfo.id);
            recentStations.unshift({ id: stationInfo.id, name: stationInfo.name });
            recentStations = recentStations.slice(0, 5);
            localStorage.setItem('recentStations', JSON.stringify(recentStations));

            displayRecentStations();
            // Get train times
            const response = await fetch(`https://7w36rckwf2qzdlzvfkmv52swnh5edl3edosr7l6hi7aru5nmnp2a.ssh.surf/arribos/estacion/${stationInfo.id}`);
            if (!response.ok) {
                throw new Error('macana');
            }
            const data = await response.json();

            if (data.results.length === 0) {
                loadingMessageDiv.style.display = 'none';
                trainScheduleDiv.innerHTML = `<div class="alert alert-warning text-center" role="alert">${getRandomMessage(noTrainMessages)}</div>`;
                return;
            }

            // Sort data by direction and arrival time
            data.results.sort((a, b) => {
                const directionA = a.servicio.hasta.estacion.nombre.toLowerCase();
                const directionB = b.servicio.hasta.estacion.nombre.toLowerCase();
                if (directionA < directionB) return -1;
                if (directionA > directionB) return 1;

                const arrivalTimeA = new Date(a.arribo.llegada.estimada);
                const arrivalTimeB = new Date(b.arribo.llegada.estimada);
                return arrivalTimeA - arrivalTimeB;
            });
            // Time table creation
            const tableRows = [];
            for (const result of data.results) {
                if (result.arribo && result.servicio) {
                    const estArrivalTimeUTC = result.arribo.llegada.estimada;
                    const progArrivalTimeUTC = result.arribo.llegada.programada;
                    const minutesRemaining = Math.floor(result.arribo.segundos / 60);
                    const direction = result.servicio.hasta.estacion.nombre;

                    const estArrivalTimeObj = new Date(estArrivalTimeUTC);
                    const progArrivalTimeObj = new Date(progArrivalTimeUTC);
                    estArrivalTimeObj.setHours(estArrivalTimeObj.getHours());
                    progArrivalTimeObj.setHours(progArrivalTimeObj.getHours());
                    const estArrivalTimeStr = estArrivalTimeObj.toTimeString().split(' ')[0];
                    const progArrivalTimeStr = progArrivalTimeObj.toTimeString().split(' ')[0];

                    if (estArrivalTimeStr === "Invalid") {
                    
                    tableRows.push(`
                        <tr>
                            <td>${progArrivalTimeStr}</td>
                            <td>-</td>
                            <td>${minutesRemaining}</td>
                            <td>${direction}</td>
                        </tr>
                    `);
                    }
                    else {
                        tableRows.push(`
                        <tr>
                            <td>${progArrivalTimeStr}</td>
                            <td>${estArrivalTimeStr}</td>
                            <td>${minutesRemaining}</td>
                            <td>${direction}</td>
                        </tr>
                    `);
                    }
                }
                
            }

            const tableHTML = `
            <div class="table-responsive">
                <table class="table table-striped table-bordered">
                    <thead>
                        <tr>
                            <th>Horario de llegada programado</th>
                            <th>Horario de llegada estimado</th>
                            <th>Minutos faltantes</th>
                            <th>Dirección</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows.join('')}
                    </tbody>
                </table>
            </div>
            `;
            trainScheduleDiv.innerHTML = tableHTML;
            loadingMessageDiv.style.display = 'none';

        } catch (error) {
            console.error('Error:', error);
            trainScheduleDiv.innerHTML = '<div class="alert alert-warning text-center" role="alert">Error al solicitar horarios, intente de nuevo.</div>';
            loadingMessageDiv.style.display = 'none';
        }
    });
    // Station search
    async function getStationId(stationName) {
        const response = await fetch(`https://7w36rckwf2qzdlzvfkmv52swnh5edl3edosr7l6hi7aru5nmnp2a.ssh.surf/infraestructura/estaciones?nombre=${stationName}`);
        const data = await response.json();
        if (data && data && data.length > 0) {
            return {
                id: data[0].id_estacion,
                name: data[0].nombre
            };
        }
        return null;
    }
    // Recent stations list
    function displayRecentStations() {
        recentStationsList.innerHTML = '';
        recentStations.forEach(station => {
            const li = document.createElement('li');
            li.textContent = station.name;
            li.addEventListener('click', () => {
                originStationInput.value = station.name;
                getTimesButton.click();
            });
            recentStationsList.appendChild(li);
        });
    }

    displayRecentStations();

    if (recentStations.length === 0) {
        recentStationsDiv.style.display = 'none';
    }

    getTimesButton.addEventListener('click', () => {
        introductionSection.style.display = 'none';
    });
});

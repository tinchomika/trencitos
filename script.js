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
            let response;
            try {
                response = await fetch(`https://ariedro.dev/api-trenes/arribos/estacion/${stationInfo.id}`);
                if (!response.ok) {
                    throw new Error('API primaria caída :(');
                }
            } catch (error) {
                console.warn('API primaria caída, intentando fallback:', error);
                response = await fetch(`https://ariedro.dev/api-trenes/arribos/estacion/${stationInfo.id}`);
                if (!response.ok) {
                    throw new Error('Se pudrió todo, no anda el servidor de Ariedro o sofse se puso la gorra');
                }
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
            // Check if final station. ex: Retiro
            let finalStation = true;
            for (const result of data.results) {
                if (result.arribo && result.arribo.llegada && Object.keys(result.arribo.llegada).length > 0) {
                    finalStation = false;
                    break;
                }
            }

            const tableHeaders = finalStation ? `
            <tr>
                <th>Horario de salida programado</th>
                <th>Minutos faltantes</th>
                <th>Dirección</th>
            </tr>
            ` : `
            <tr>
                <th>Horario de llegada programado</th>
                <th>Horario de llegada estimado</th>
                <th>Minutos faltantes</th>
                <th>Dirección</th>
            </tr>
            `;
            // Time schedule creation
            const tableRows = [];
            for (const result of data.results) {
                if (result.arribo && result.servicio) {
                    const estArrivalTimeUTC = !finalStation && result.arribo.llegada ? result.arribo.llegada.estimada : null;
                    const progArrivalTimeUTC = finalStation ? result.arribo.salida.programada : (result.arribo.llegada.programada || result.arribo.salida.programada);
                    const minutesRemaining = Math.floor(result.arribo.segundos / 60);
                    const direction = result.servicio.hasta.estacion.nombre;

                    const progArrivalTimeObj = new Date(progArrivalTimeUTC);
                    progArrivalTimeObj.setHours(progArrivalTimeObj.getHours());
                    const progArrivalTimeStr = progArrivalTimeObj.toTimeString().split(' ')[0];

                    let estArrivalTimeStr = "-";
                    if (estArrivalTimeUTC) {
                        const estArrivalTimeObj = new Date(estArrivalTimeUTC);
                        estArrivalTimeObj.setHours(estArrivalTimeObj.getHours());
                        estArrivalTimeStr = estArrivalTimeObj.toTimeString().split(' ')[0];
                        if (estArrivalTimeStr === "Invalid") {
                            estArrivalTimeStr = "-";
                        }
                    }



                    if (finalStation) {
                        tableRows.push(`
                            <tr>
                                <td>${progArrivalTimeStr}</td>
                                <td>${minutesRemaining}</td>
                                <td>${direction}</td>
                            </tr>
                        `);
                    } else {
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
                        ${tableHeaders}
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
        try {
            const response = await fetch(`https://ariedro.dev/api-trenes/infraestructura/estaciones?nombre=${stationName}`);
            if (!response.ok) {
                throw new Error('API primaria caída :(');
            }
            const data = await response.json();
            if (data && data.length > 0) {
                return {
                    id: data[0].id_estacion,
                    name: data[0].nombre
                };
            }
        } catch (error) {
            console.warn('API primaria caída, intentando fallback:', error);
            const response = await fetch(`https://ariedro.dev/api-trenes/infraestructura/estaciones?nombre=${stationName}`);
            if (!response.ok) {
                throw new Error('Se pudrió todo, no anda el servidor de Ariedro o sofse se puso la gorra');
            }
            const data = await response.json();
            if (data && data.length > 0) {
                return {
                    id: data[0].id_estacion,
                    name: data[0].nombre
                };
            }
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

// Version checker
const CURRENT_VERSION = '1.0.4';
const debug = false;
async function checkVersion() {
  try {
    const response = await fetch('https://raw.githack.com/tinchomika/trencitos/main/current_ver.json');
    const data = await response.json();
    
    if (data.version !== CURRENT_VERSION || debug) {
        document.getElementById('version').style.display = 'block';
        document.getElementById('version').innerHTML = `
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            <strong>Nueva versión disponible:</strong> ${data.version}<br>
            <strong>Novedades:</strong> ${data.changelog}<br>
            <button type="button" class="btn btn-primary btn-sm mt-2" onclick="localStorage.clear(); location.reload(true);">Actualizar</button>
        `;
        document.getElementById('version').classList.add('show');
        
        console.log('Nueva versión disponible:', data.version, "Novedades:", data.changelog);
    }

  } catch (error) {
    console.error('Error verificando versión:', error);
  }
}


window.addEventListener('load', checkVersion);
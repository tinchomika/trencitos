document.addEventListener('DOMContentLoaded', () => {
    const originStationInput = document.getElementById('origin-station');
    const getTimesButton = document.getElementById('get-times');
    const trainScheduleDiv = document.getElementById('train-schedule');

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

    function getRandomMessage(messages) {
        return messages[Math.floor(Math.random() * messages.length)];
    }

    getTimesButton.addEventListener('click', async () => {
        const originStationName = originStationInput.value;

        if (!originStationName) {
            trainScheduleDiv.innerHTML = `<div class="alert alert-warning text-center" role="alert"> Escribí de donde salis papu.'</div>`;
            return;
        }

        try {
            const originStationId = await getStationId(originStationName);

            if (!originStationId) {
                trainScheduleDiv.innerHTML = `<div class="alert alert-warning text-center" role="alert"> No se encontró la estación.'</div>`;
                return;
            }

            const response = await fetch(`https://vhyhkns6n47tn6wlajsiht66m5vc5flne3qlkibmckgtpsu6dfza.ssh.surf/api/trains/stations/${originStationId}/schedules`);
            if (!response.ok) {
                throw new Error('macana');
            }
            const data = await response.json();

            if (data.results.length === 0) {
                trainScheduleDiv.innerHTML = `<div class="alert alert-warning text-center" role="alert">${getRandomMessage(noTrainMessages)}</div>`;
                return;
            }

            // Sort data by direction and arrival time
            data.results.sort((a, b) => {
                const directionA = a.servicio.cabeceraFinal.nombre.toLowerCase();
                const directionB = b.servicio.cabeceraFinal.nombre.toLowerCase();
                if (directionA < directionB) return -1;
                if (directionA > directionB) return 1;

                const arrivalTimeA = new Date(a.desde.llegada);
                const arrivalTimeB = new Date(b.desde.llegada);
                return arrivalTimeA - arrivalTimeB;
            });

            const tableRows = [];
            for (const result of data.results) {
                if (result.desde && result.servicio) {
                    const arrivalTimeUTC = result.desde.llegada;
                    const minutesRemaining = Math.floor(result.desde.segundos / 60);
                    const direction = result.servicio.cabeceraFinal.nombre;

                    const arrivalTimeObj = new Date(arrivalTimeUTC);
                    arrivalTimeObj.setHours(arrivalTimeObj.getHours());
                    const arrivalTimeStr = arrivalTimeObj.toTimeString().split(' ')[0];

                    tableRows.push(`
                        <tr>
                            <td>${arrivalTimeStr}</td>
                            <td>${minutesRemaining}</td>
                            <td>${direction}</td>
                        </tr>
                    `);
                }
            }

            const tableHTML = `
            <div class="table-responsive">
                <table class="table table-striped table-bordered">
                    <thead>
                        <tr>
                            <th>Horario de llegada</th>
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

        } catch (error) {
            console.error('Error:', error);
            trainScheduleDiv.textContent = 'Error al solicitar horarios.';
        }
    });

    async function getStationId(stationName) {
        const response = await fetch(`https://vhyhkns6n47tn6wlajsiht66m5vc5flne3qlkibmckgtpsu6dfza.ssh.surf/api/trains/stations/search?nombre=${stationName}`);
        const data = await response.json();
        if (data && data.results && data.results.length > 0) {
            return data.results[0].id;
        }
        return null;
    }
});

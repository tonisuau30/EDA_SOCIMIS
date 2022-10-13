# Exploratory Data Analysis: SOCIMIs, ibex35 e IPC
#### The Bridge - Bootcamp Data Science Full-Time abril 2022

## Descripción del proyecto:

A través de este EDA se pretende estudiar a las SOCIMI como producto financiero para protegerse frente a la inflación, planteándose como hipótesis nula que deberían funcionar como tal, ya que por el carácter de dichas empresas su exposición al mercado inmobiliario es total y el porcentaje de la vivienda sobre el calculo del IPC en base a 2021 ha aumentado respecto al cálcuo anterior.

1. Se han extraido los datos de yahoo finance tanto para los precios de las acciones como para los puntos del índice, importándolos como DataFrames.
2. Se han extraido los datos del IPC mediante un csv descargado de la página del INE, importándolos como DataFrames.
3. Se han limpiado los DataFrames de las SOCIMI e IBEX35 para poder agruparlos por meses y asi compararlos con el IPC, el cuál viene dado en periodos mensuales.
4. Se han concatenado en un mismo DataFrame las columnas con la variación mensual acumulada para obtener una imagen más fiel de las fluctuaciones en los gráficos.
5. Los gráficos se han creado mediante la libreríade visualización plotly, por su capacidad dinámica.

## Librerias y recursos:
Plotly (plotly.express, plotly.graph_objects, plotly.subplots), pandas (pandas_datareader.data) y numpy.

## Archivos adjuntos:
* IPC_ES_2022M08.CSV: archivo csv extraído del INE con los datos mensuales del IPC.
---
## Observaciones:

Podemos concluir que la hipótesis nula se rechaza, y que a pesar de la aparente idea de que las SOCIMI puedan ser un buen activo en nuestras carteras frente a la inflación, finalmente están mayormente correlacionadas con el mercado.

No obstante, debemos destacar que el valor de las SOCIMI no se centra solamente en el valor de la acción, sino en la rentabilidad de dividendos que ofrece a sus accionistas, sin embargo, el precio de estás no deja de ser un fuerte indicativo con el que medir su evolución, ya
que un aumento de la rentabilidad de dividendos durante varios periodos consecutivos suele conllevar un aumento en el valor de la empresa.

Finalmente, también cabe explicar la correlación un tanto más elevada de Merlin con el IPC. Esta correlación puede explicarse debido a un factor principal, la elevada capitalización de Merlin Properties frente a las demás SOCIMI, lo que la conlleva a tener una mayor correlación con el propio índice debido a que el IBEX35 es un índice ponderado, quién a su vez, tiene también cierto grado de correlación con el IPC.

### Autor:
Antoni Suau Maget - <tonisuau30@gmail.com>

